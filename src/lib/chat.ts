import { callOpenAIChat } from './personality/tools';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(
  messages: ChatMessage[],
  options: any = {}
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const payload = {
    provider: options.provider ?? "openai",
    model: options.model ?? "gpt-4o-mini", 
    temperature: typeof options.temperature === "number" ? options.temperature : 0.2,
    max_output_tokens: options.max_output_tokens ?? 700,
    response_format: options.response_format ?? "text",
    json_schema: options.json_schema ?? null,
    messages
  };
  
  const result = await callOpenAIChat(payload);
  
  if (!result.ok) {
    return { ok: false, error: `openai-chat ${result.status}: ${result.text}` };
  }

  const content = result.json?.message ?? result.json?.content ?? result.text ?? "";
  if (!content) {
    return { ok: false, error: 'No content in edge response' };
  }
  
  return { ok: true, content };
}