export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface ChatState {
  currentMessages: ChatMessage[];
  chatHistories: ChatHistory[];
  activeChatId: string | null;
}