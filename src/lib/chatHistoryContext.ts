import { getSupabase } from './supabase';

/**
 * Build lightweight history context for Pat from recent conversations
 * Returns a compact snippet from the most recent other session
 */
export async function buildHistoryContext(userId: string, exceptSessionId?: string): Promise<string> {
  try {
    const supabase = getSupabase();
    
    // Get 3 most recent sessions (excluding current)
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id, last_activity_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('id', exceptSessionId || '')
      .order('last_activity_at', { ascending: false })
      .limit(3);

    if (!sessions?.length) return '';

    // Get last assistant reply from most recent session (Pat's last response in that chat)
    const mostRecentId = sessions[0].id;
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', mostRecentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages?.length) return '';

    // Extract last assistant message
    const assistantMsg = messages.find(m => m.role === 'assistant');
    if (!assistantMsg) return '';

    // Normalize content
    const norm = (c: any) =>
      typeof c === 'string' ? c : (c?.text ?? c?.content ?? '');
    
    const content = norm(assistantMsg.content);
    if (!content) return '';

    // Cap at 600 chars for safety
    const snippet = content.slice(0, 600);
    
    return `Previous conversation context:\n${snippet}`;
  } catch (error) {
    console.error('[HistoryContext] Failed to build:', error);
    return '';
  }
}


