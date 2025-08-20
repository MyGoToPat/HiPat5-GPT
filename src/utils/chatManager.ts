import { ChatHistory, ChatMessage, ChatState } from '../types/chat';
import { getSupabase } from '../lib/supabase';

export class ChatManager {
  
  static async loadChatState(): Promise<ChatState> {
    try {
      const supabase = getSupabase();
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        return this.getDefaultChatState();
      }

      // Fetch chat histories for the user
      const { data: histories, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error loading chat histories:', error);
        return this.getDefaultChatState();
      }

      const chatHistories: ChatHistory[] = (histories || []).map(history => ({
        id: history.id,
        title: history.title,
        messages: [], // Messages will be loaded when chat is opened
        createdAt: new Date(history.created_at),
        lastMessageAt: new Date(history.last_message_at)
      }));

      return {
        currentMessages: this.getInitialMessages(),
        chatHistories,
        activeChatId: null
      };
    } catch (error) {
      console.error('Failed to load chat state:', error);
      return this.getDefaultChatState();
    }
  }

  private static getDefaultChatState(): ChatState {
    return {
      currentMessages: this.getInitialMessages(),
      chatHistories: [],
      activeChatId: null
    };
  }

  static async saveNewChat(messages: ChatMessage[]): Promise<ChatHistory | null> {
    try {
      const supabase = getSupabase();
      const user = await supabase.auth.getUser();
      if (!user.data.user) return null;

      // Don't save if there's only the initial greeting
      if (messages.length <= 1) return null;

      const title = this.generateChatTitle(messages);
      const lastMessage = messages[messages.length - 1];

      // Insert chat history
      const { data: chatHistory, error: historyError } = await supabase
        .from('chat_histories')
        .insert({
          user_id: user.data.user.id,
          title,
          created_at: messages[0]?.timestamp.toISOString() || new Date().toISOString(),
          last_message_at: lastMessage?.timestamp.toISOString() || new Date().toISOString()
        })
        .select()
        .single();

      if (historyError) {
        console.error('Error saving chat history:', historyError);
        return null;
      }

      // Insert all messages
      const messagesToInsert = messages.map(msg => ({
        chat_history_id: chatHistory.id,
        text: msg.text,
        timestamp: msg.timestamp.toISOString(),
        is_user: msg.isUser
      }));

      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (messagesError) {
        console.error('Error saving chat messages:', messagesError);
        return null;
      }

      return {
        id: chatHistory.id,
        title: chatHistory.title,
        messages: [...messages],
        createdAt: new Date(chatHistory.created_at),
        lastMessageAt: new Date(chatHistory.last_message_at)
      };
    } catch (error) {
      console.error('Error in saveNewChat:', error);
      return null;
    }
  }

  static async loadChatMessages(chatHistoryId: string): Promise<ChatMessage[]> {
    try {
      const supabase = getSupabase();
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_history_id', chatHistoryId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        return [];
      }

      return (messages || []).map(msg => ({
        id: msg.id,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
        isUser: msg.is_user
      }));
    } catch (error) {
      console.error('Error in loadChatMessages:', error);
      return [];
    }
  }

  static async saveMessage(chatHistoryId: string | null, message: ChatMessage): Promise<string | null> {
    try {
      const supabase = getSupabase();
      const user = await supabase.auth.getUser();
      if (!user.data.user) return null;

      let actualChatHistoryId = chatHistoryId;

      // If no chat history exists, create one
      if (!actualChatHistoryId) {
        const { data: newHistory, error: historyError } = await supabase
          .from('chat_histories')
          .insert({
            user_id: user.data.user.id,
            title: this.generateChatTitle([message]),
            created_at: message.timestamp.toISOString(),
            last_message_at: message.timestamp.toISOString()
          })
          .select()
          .single();

        if (historyError) {
          console.error('Error creating chat history:', historyError);
          return null;
        }

        actualChatHistoryId = newHistory.id;
      } else {
        // Update last_message_at for existing chat
        await supabase
          .from('chat_histories')
          .update({ last_message_at: message.timestamp.toISOString() })
          .eq('id', actualChatHistoryId);
      }

      // Insert the message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_history_id: actualChatHistoryId,
          text: message.text,
          timestamp: message.timestamp.toISOString(),
          is_user: message.isUser
        });

      if (messageError) {
        console.error('Error saving message:', messageError);
        return null;
      }

      return actualChatHistoryId;
    } catch (error) {
      console.error('Error in saveMessage:', error);
      return null;
    }
  }

  static generateChatTitle(messages: ChatMessage[]): string {
    // Find the first user message to generate a title
    const firstUserMessage = messages.find(msg => msg.isUser);
    if (firstUserMessage) {
      // Take first 30 characters and add ellipsis if longer
      const title = typeof firstUserMessage.text === 'string' ? firstUserMessage.text.trim() : 'Untitled Chat';
      return title.length > 30 ? title.substring(0, 30) + '...' : title;
    }
    
    // Fallback titles based on message content
    const messageText = messages.map(m => typeof m.text === 'string' ? m.text.toLowerCase() : '').join(' ');
    
    if (messageText.includes('workout') || messageText.includes('exercise')) {
      return 'Workout Discussion';
    } else if (messageText.includes('meal') || messageText.includes('food') || messageText.includes('eat')) {
      return 'Meal Planning Session';
    } else if (messageText.includes('sleep') || messageText.includes('rest')) {
      return 'Sleep & Recovery Chat';
    } else if (messageText.includes('goal') || messageText.includes('plan')) {
      return 'Goal Planning Session';
    }
    
    return `Chat from ${new Date().toLocaleDateString()}`;
  }
  
  static getInitialMessages(): ChatMessage[] {
    return [{
      id: crypto.randomUUID(),
      text: "Talk to me!",
      timestamp: new Date(),
      isUser: false
    }];
  }
  
  static formatChatDate(date: Date): string {
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
}