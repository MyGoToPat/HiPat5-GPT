import { getSupabase } from './supabase';

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  active: boolean;
  session_type: 'user_chat' | 'admin_test' | 'onboarding';
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  sender: 'user' | 'pat' | 'system';
  text: string;
  timestamp: string;
}

export interface ChatSummary {
  id: string;
  session_id: string;
  user_id: string;
  summary: string;
  facts: Record<string, any>;
  message_count: number;
  created_at: string;
}

export const ChatSessions = {
  async getOrCreateActiveSession(
    userId: string,
    sessionType: 'user_chat' | 'admin_test' | 'onboarding' = 'user_chat'
  ): Promise<ChatSession> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('get_or_create_active_session', {
      p_user_id: userId,
      p_session_type: sessionType
    });

    if (error) throw error;

    const sessionId = data;

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found after creation');

    return session;
  },

  async getActiveSession(userId: string): Promise<ChatSession | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async closeSession(sessionId: string, summary?: string): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase.rpc('close_chat_session', {
      p_session_id: sessionId,
      p_summary: summary || null
    });

    if (error) throw error;
  },

  async getSessionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ChatSession[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async saveMessage(message: {
    sessionId: string;
    userId: string;
    sender: 'user' | 'pat' | 'system';
    text: string;
  }): Promise<ChatMessage> {
    const supabase = getSupabase();

    const { data, error} = await supabase
      .from('chat_messages')
      .insert({
        chat_history_id: message.sessionId, // Use chat_history_id (NOT NULL column)
        session_id: message.sessionId,
        user_id: message.userId,
        sender: message.sender,
        text: message.text,
        is_user: message.sender === 'user', // Add required is_user field
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSessionMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async getRecentMessages(
    userId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse();
  },

  async getSessionSummary(sessionId: string): Promise<ChatSummary | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getUserSummaries(
    userId: string,
    limit: number = 10
  ): Promise<ChatSummary[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('chat_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async subscribeToSessionMessages(
    sessionId: string,
    onMessage: (message: ChatMessage) => void,
    onError?: (error: any) => void
  ) {
    const supabase = getSupabase();

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to session ${sessionId} messages`);
        } else if (status === 'CHANNEL_ERROR' && onError) {
          onError(new Error('Channel error'));
        } else if (status === 'TIMED_OUT' && onError) {
          onError(new Error('Subscription timed out'));
        }
      });

    return {
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
      }
    };
  }
};
