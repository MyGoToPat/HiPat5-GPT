// Chat persistence wrapper using new session-based system
import { ChatSessions } from '../lib/chatSessions';
import type { ChatSession, ChatMessage } from '../lib/chatSessions';

export type ChatMessageRow = {
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export const ChatManager = {
  async ensureActiveSession(userId: string): Promise<ChatSession> {
    try {
      return await ChatSessions.getOrCreateActiveSession(userId, 'user_chat');
    } catch (error) {
      console.error('Failed to ensure active session:', error);
      throw error;
    }
  },

  async saveMessage(params: {
    userId: string;
    sessionId: string;
    text: string;
    sender: 'user' | 'pat' | 'system';
    metadata?: Record<string, any>;
  }): Promise<ChatMessage | null> {
    const { userId, sessionId, text, sender, metadata } = params;
    if (!sessionId) {
      throw new Error('saveMessage: sessionId is required');
    }
    try {
      return await ChatSessions.saveMessage({
        sessionId,
        userId,
        sender,
        text,
        metadata
      });
    } catch (error) {
      console.warn('Chat message save failed:', error);
      return null;
    }
  },

  async loadChatState(userId: string) {
    try {
      const activeSession = await ChatSessions.getActiveSession(userId);
      if (activeSession) {
        const messages = await ChatSessions.getSessionMessages(activeSession.id);
        return {
          currentMessages: messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            timestamp: new Date(msg.timestamp),
            isUser: msg.sender === 'user'
          })),
          chatHistories: [],
          activeChatId: activeSession.id
        };
      }

      return {
        currentMessages: this.getInitialMessages(),
        chatHistories: [],
        activeChatId: null
      };
    } catch (error) {
      console.error('Failed to load chat state:', error);
      return {
        currentMessages: this.getInitialMessages(),
        chatHistories: [],
        activeChatId: null
      };
    }
  },

  async saveNewChat(messages: any[]) {
    return null;
  },

  async loadChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      return await ChatSessions.getSessionMessages(sessionId);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      return [];
    }
  },

  async closeSession(sessionId: string, summary?: string) {
    try {
      await ChatSessions.closeSession(sessionId, summary);
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  },

  subscribeToMessages(
    sessionId: string,
    onMessage: (message: ChatMessage) => void
  ) {
    return ChatSessions.subscribeToSessionMessages(
      sessionId,
      onMessage,
      (error) => console.error('Realtime subscription error:', error)
    );
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