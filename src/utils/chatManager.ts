// Lightweight, defensive chat persistence wrapper.
// If SAVE_TO_DB=false, we no-op. If insert fails, we swallow the error and keep UI responsive.

import { getSupabase } from '../lib/supabase';

const SAVE_TO_DB = false; // UI-only by default. Flip to true after we align table columns.

export type ChatMessageRow = {
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  // Optional metadata bag we can safely store if the column exists.
  // If your table has jsonb "metadata", uncomment it below and include it in upsert.
  // metadata?: Record<string, any>;
};

async function insertRow(row: ChatMessageRow) {
  const supabase = getSupabase();
  // NOTE: Only send columns we are sure exist: thread_id, role, content, created_at (server default).
  // DO NOT send user_id (column not present in your table).
  const { error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: row.thread_id,
      role: row.role,
      content: row.content,
      // metadata: row.metadata ?? null,
    })
    .select()
    .single();

  if (error) throw error;
}

export const ChatManager = {
  async saveMessage(row: ChatMessageRow) {
    if (!SAVE_TO_DB) return; // UI-only mode prevents fatal failures.
    try {
      await insertRow(row);
    } catch (e) {
      // Log but DO NOT propagate. We never block UX on persistence.
      console.warn("chat save skipped:", e);
    }
  },

  // Keep existing methods for backward compatibility
  async loadChatState() {
    return {
      currentMessages: this.getInitialMessages(),
      chatHistories: [],
      activeChatId: null
    };
  },

  async saveNewChat(messages: any[]) {
    return null;
  },

  async loadChatMessages(chatHistoryId: string) {
    return [];
  },

  generateChatTitle(messages: any[]) {
    const firstUserMessage = messages.find(msg => msg.isUser);
    if (firstUserMessage) {
      const title = typeof firstUserMessage.text === 'string' ? firstUserMessage.text.trim() : 'Untitled Chat';
      return title.length > 30 ? title.substring(0, 30) + '...' : title;
    }
    return `Chat from ${new Date().toLocaleDateString()}`;
  },

  getInitialMessages() {
    return [{
      id: crypto.randomUUID(),
      text: "Talk to me!",
      timestamp: new Date(),
      isUser: false
    }];
  },

  formatChatDate(date: Date) {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }
};