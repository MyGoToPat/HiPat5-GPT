/**
 * CHAT SESSIONS MANAGEMENT
 * Create and manage chat sessions
 */

import { supabase } from '../../lib/supabase';
import { safeSelect } from '../../lib/safeSelect';

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  title?: string;
}

/**
 * Ensure user has an active chat session, create if needed
 */
export async function ensureChatSession(userId: string): Promise<string> {
  if (!userId) {
    throw new Error('ensureChatSession: userId required');
  }

  // Check for existing active session (started within last 24 hours)
  const { data: existingSessions, error: fetchError } = await supabase
    .from('chat_sessions')
    .select(safeSelect('id, started_at'))
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('[ensureChatSession] Error fetching sessions:', fetchError);
    throw fetchError;
  }

  // If we have a recent session (within 24 hours), use it
  if (existingSessions && existingSessions.length > 0) {
    const lastSession = existingSessions[0];
    const sessionAge = Date.now() - new Date(lastSession.started_at).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (sessionAge < twentyFourHours) {
      console.log('[ensureChatSession] Using existing session:', lastSession.id);
      return lastSession.id;
    }
  }

  // Create new session
  const { data: newSession, error: createError } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select(safeSelect('id'))
    .single();

  if (createError) {
    console.error('[ensureChatSession] Error creating session:', createError);
    throw createError;
  }

  console.log('[ensureChatSession] Created new session:', newSession.id);
  return newSession.id;
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select(safeSelect('*'))
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getUserSessions] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a chat session (and all its messages via cascade)
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId); // Safety: only delete if user owns it

  if (error) {
    console.error('[deleteSession] Error:', error);
    throw error;
  }

  console.log('[deleteSession] Deleted session:', sessionId);
}
