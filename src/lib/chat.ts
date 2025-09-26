import { callOpenAIChat } from './personality/tools';
import { withBackoff } from './personality/retry';

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
  
  try {
    const result = await withBackoff(async () => {
      const r = await callOpenAIChat(payload);
      if (!r.ok) throw new Error(`openai-chat ${r.status}: ${r.text ?? ""}`);
      return r;
    }, { tries: 3, baseMs: 600 });
    
    const content = result.json?.message ?? result.json?.content ?? result.text ?? "";
    if (!content) {
      return { ok: false, error: 'No content in edge response' };
    }
    
    return { ok: true, content };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Chat failed' };
  }
}