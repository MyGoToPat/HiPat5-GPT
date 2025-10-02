/**
 * Streaming Chat Utility
 *
 * Handles Server-Sent Events (SSE) streaming for real-time chat responses
 * Provides typing animation as tokens arrive from OpenAI
 */

export interface StreamingChatOptions {
  messages: Array<{ role: string; content: string }>;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

/**
 * Call OpenAI chat with streaming enabled
 * Tokens are delivered in real-time via the onToken callback
 */
export async function callChatStreaming(options: StreamingChatOptions): Promise<void> {
  const { messages, onToken, onComplete, onError } = options;

  let fullText = '';
  let eventSource: EventSource | null = null;

  try {
    // Get Supabase URL and anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Use intelligent-chat endpoint (routes between OpenAI and Gemini)
    const response = await fetch(`${supabaseUrl}/functions/v1/intelligent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Stream failed' }));
      throw new Error(errorData.error || 'Failed to start stream');
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();

          if (data === '[DONE]') {
            // Stream complete
            onComplete(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              onToken(parsed.token);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
            console.debug('Parse error (expected for partial chunks):', e);
          }
        }
      }
    }

    // If we exit the loop without [DONE], still call onComplete
    onComplete(fullText);

  } catch (error: any) {
    console.error('Streaming error:', error);
    onError(error.message || 'Streaming failed');

    if (eventSource) {
      eventSource.close();
    }
  }
}

/**
 * Fallback: Non-streaming chat call
 * Use this if streaming fails or is not supported
 */
export async function callChatNonStreaming(
  messages: Array<{ role: string; content: string }>
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { ok: false, error: 'Supabase configuration missing' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/intelligent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      return { ok: false, error: errorData.error || 'Chat failed' };
    }

    const data = await response.json();
    return { ok: true, content: data.message };

  } catch (error: any) {
    return { ok: false, error: error.message || 'Chat failed' };
  }
}
