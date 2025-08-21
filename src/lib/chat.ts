import { getSupabase } from './supabase';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(
  messages: ChatMessage[]
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: { messages },
  });
  if (error) return { ok: false, error: error.message ?? 'Edge function failed' };

  let content: string | undefined = undefined;
  if (typeof data === 'string') content = data;
  else if (typeof data?.content === 'string') content = data.content;
  else if (typeof data?.message === 'string') content = data.message;
  else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content)
    content = data.choices[0].message.content;

  if (!content) return { ok: false, error: 'No content in edge response' };
  return { ok: true, content };
}