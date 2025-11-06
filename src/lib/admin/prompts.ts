import { getSupabase } from '../supabase';

export type LatestPromptRow = {
  agent_id: string;
  version: number;
  model: string | null;
  phase: string | null;
  exec_order: number | null;
  content: string | null;
  created_at: string;
};

export async function fetchLatestPublishedPrompts(agentIds?: string[]) {
  const supabase = getSupabase();

  let q = supabase
    .from('agent_prompts_latest_published')
    .select('agent_id, version, model, phase, exec_order, content, created_at')
    .order('agent_id', { ascending: true });

  if (agentIds && agentIds.length > 0) {
    q = q.in('agent_id', agentIds);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[admin-prompts] select error', error);
    throw error;
  }
  return (data ?? []) as LatestPromptRow[];
}

// --- types for a single prompt row (latest) ---
export type AgentPromptLatest = {
  agent_id: string;
  version: number | null;
  model: string | null;
  phase: string | null;
  exec_order: number | null;
  content: string | null;
  created_at: string | null;
};

// --- fetch latest published prompt for a single agent id ---
export async function fetchLatestPromptByAgentId(agentId: string): Promise<AgentPromptLatest | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('agent_prompts_latest_published')
    .select('agent_id, version, model, phase, exec_order, content, created_at')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    console.warn('[admin-prompts] fetchLatestPromptByAgentId error', error);
    return null;
  }
  return (data as AgentPromptLatest) ?? null;
}

// --- runtime helper: fetch from DB or use fallback ---
export async function getLatestPromptOrFallback(agentKey: string, fallback: string): Promise<string> {
  try {
    const row = await fetchLatestPromptByAgentId(agentKey);
    if (row?.content) {
      console.info('[tmwya-prompts] using DB prompt:', agentKey, 'v'+(row.version ?? '?'));
      return row.content;
    }
  } catch (e) {
    console.warn('[tmwya-prompts] DB prompt fetch failed for', agentKey, e);
  }
  console.info('[tmwya-prompts] using FALLBACK prompt:', agentKey);
  return fallback;
}

