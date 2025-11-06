import 'dotenv/config';
import { Client } from 'pg';
import { writeFileSync } from 'fs';

const { SUPABASE_DB_URL } = process.env; // e.g., postgres://... (service role)
if (!SUPABASE_DB_URL) throw new Error('Missing SUPABASE_DB_URL');

async function main() {
  const client = new Client({ connectionString: SUPABASE_DB_URL });
  await client.connect();
  const res = await client.query(`
    SELECT prompt_code, title, phase, "order", model, version, locked, content
    FROM personality_prompts
    ORDER BY phase, "order"
  `);

  const values = res.rows.map(r => `(
    '${r.prompt_code.replace(/'/g,"''")}',
    '${r.title.replace(/'/g,"''")}',
    '${r.phase}',
    ${r.order},
    '${r.model}',
    ${r.version},
    ${r.locked ? 'true' : 'false'},
    $$${r.content}$$
  )`).join(',\n');

  const sql = `WITH seed AS (
  SELECT * FROM (VALUES
${values}
  ) AS t(prompt_code, title, phase, "order", model, version, locked, content)
)
INSERT INTO personality_prompts AS p (prompt_code, title, phase, "order", model, version, locked, content)
SELECT prompt_code, title, phase, "order", model, version, locked, content FROM seed
ON CONFLICT (prompt_code) DO UPDATE
SET title=EXCLUDED.title,
    phase=EXCLUDED.phase,
    "order"=EXCLUDED."order",
    model=EXCLUDED.model,
    version=EXCLUDED.version,
    content=EXCLUDED.content,
    updated_at=now()
WHERE p.locked IS NOT TRUE;`;

  const out = `supabase/seed/personality_prompts.snapshot.sql`;
  writeFileSync(out, sql);
  console.log('Wrote', out);
  await client.end();
}

main();
