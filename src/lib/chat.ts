// Edge Chat caller
import { getSupabase } from './supabase';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(messages: ChatMessage[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: { messages },
  });
  if (error) throw error;
  if (!data) throw new Error('No data returned from chat service');
  
  return {
    ok: true,
    message: data.message || "I'm here to help!",
    usage: data.usage
  };
}