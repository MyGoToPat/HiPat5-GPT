import { supabase } from './supabase';

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  active: boolean;
  session_type: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function createChatSession(userId: string, title?: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      session_type: 'general',
      active: true,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  return data;
}

export async function getChatSessions(userId: string, limit = 20): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[chatHistory] Error fetching sessions:', error);
    return [];
  }

  return data || [];
}

export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<ChatMessage> {
  // Generate client-side UUID to prevent conflicts
  const messageId = crypto.randomUUID();

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      id: messageId,
      session_id: sessionId,
      role,
      content,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    // Enhanced error logging for debugging 409s
    console.error('[chatHistory] Failed to add message:', {
      error: error.message,
      code: error.code,
      details: error.details,
      sessionId,
      role,
      messageId
    });
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return data;
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[chatHistory] Error fetching messages:', error);
    return [];
  }

  return data || [];
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

export async function getOrCreateTodaySession(userId: string): Promise<ChatSession> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .gte('started_at', `${today}T00:00:00Z`)
    .lt('started_at', `${today}T23:59:59Z`)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  return createChatSession(userId);
}
