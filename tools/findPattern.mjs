import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    if (d.isFile() && (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.js'))) return [p];
    return [];
  });
}

const pattern = process.argv[2];
if (!pattern) { console.error('Usage: node tools/findPattern.mjs "<regex>"'); process.exit(1); }
const re = new RegExp(pattern, 'm');
const files = walk('src');
let hits = 0;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  if (re.test(txt)) { console.log(f); hits++; }
}
process.exit(hits ? 1 : 0);