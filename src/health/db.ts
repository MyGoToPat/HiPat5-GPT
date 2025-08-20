import { getSupabase } from '../lib/supabase';

type TableCheck = { table: string; ok: boolean; error?: string; count?: number };

export async function dbHealth(writeTest: boolean) {
  const supabase = getSupabase();

  // 1) Env status
  const env = {
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasAnon: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  // 2) Session
  const { data: sessionData } = await supabase.auth.getSession();
  const session = {
    hasSession: !!sessionData?.session,
    userId: sessionData?.session?.user?.id ?? null,
  };

  // 3) Read checks (use head-count to avoid pulling data)
  const requiredTables = ['profiles', 'user_metrics']; // extend if needed
  const reads: TableCheck[] = [];
  for (const t of requiredTables) {
    try {
      const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
      reads.push({ table: t, ok: !error, error: error?.message, count: count ?? undefined });
    } catch (e: any) {
      reads.push({ table: t, ok: false, error: String(e?.message || e) });
    }
  }

  // 4) Optional write test (only with session to respect RLS)
  const writes: { ok: boolean; error?: string }[] = [];
  if (writeTest && session.hasSession) {
    try {
      // create a tiny chat history, then delete it
      const marker = `health-${Date.now()}`;
      const { data: ch, error: insErr } = await supabase
        .from('chat_histories')
        .insert([{ title: marker }])
        .select('id')
        .single();

      if (insErr) {
        writes.push({ ok: false, error: insErr.message });
      } else {
        const { error: delErr } = await supabase.from('chat_histories').delete().eq('id', ch.id);
        writes.push({ ok: !delErr, error: delErr?.message });
      }
    } catch (e: any) {
      writes.push({ ok: false, error: String(e?.message || e) });
    }
  }

  return { env, session, reads, writes };
}