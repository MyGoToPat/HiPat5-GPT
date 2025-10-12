/**
 * CHAT MESSAGE STORAGE
 * Store and retrieve chat messages
 */

import { supabase } from '../../lib/supabase';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

/**
 * Store a message in the database
 */
export async function storeMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[storeMessage] Error:', error);
    throw error;
  }

  return data.id;
}

/**
 * Load recent messages for a session
 */
export async function loadRecentMessages(
  sessionId: string,
  limit: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[loadRecentMessages] Error:', error);
    throw error;
  }

  // Reverse to get chronological order (oldest first)
  const messages = (data || []).reverse();

  // Filter out system messages for context (keep only user/assistant)
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/**
 * Get all messages for a session (for display)
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getSessionMessages] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete all messages in a session
 */
export async function deleteSessionMessages(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    console.error('[deleteSessionMessages] Error:', error);
    throw error;
  }

  console.log('[deleteSessionMessages] Deleted messages for session:', sessionId);
}

/**
 * Summarize old messages if context window gets too long
 * TODO: Implement actual summarization using LLM
 */
export async function summarizeOldMessages(messages: ChatMessage[]): Promise<string> {
  // Placeholder - will be implemented later
  const summaryText = messages
    .slice(0, Math.max(0, messages.length - 10))
    .map(m => `${m.role}: ${m.content.substring(0, 100)}...`)
    .join('\n');

  return `[Previous conversation summary]\n${summaryText}`;
}
