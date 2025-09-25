import { getSupabase } from './supabase';
import { invokeEdgeFunction } from './personality/tools';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(
  messages: ChatMessage[],
  options: any = {}
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const payload = {
    messages,
    ...options
  };
  
  const result = await invokeEdgeFunction('openai-chat', payload);
  if (!result.ok) return { ok: false, error: result.error ?? 'Edge function failed' };

  let content: string | undefined = undefined;
  const data = result.result;
  if (typeof data === 'string') content = data;
  else if (typeof data?.message === 'string') content = data.message;
  else if (typeof data?.content === 'string') content = data.content;
  else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content)
    content = data.choices[0].message.content;

  if (!content) return { ok: false, error: 'No content in edge response' };
  return { ok: true, content };
}