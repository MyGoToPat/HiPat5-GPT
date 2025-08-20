type EdgeResult = {
  name: string;
  ok: boolean;
  status: number;
  error?: string;
  contentType?: string | null;
  bodyKind?: 'json' | 'text' | 'none';
};

async function callEdge(name: string, payload: any): Promise<EdgeResult & { body?: any }> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${base}/functions/v1/${name}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    const ct = res.headers.get('content-type');
    let body: any = undefined;
    let bodyKind: 'json' | 'text' | 'none' = 'none';

    if (ct?.includes('application/json')) {
      body = await res.json().catch(() => null);
      bodyKind = 'json';
    } else {
      const txt = await res.text().catch(() => '');
      body = txt || null;
      bodyKind = 'text';
    }

    return { name, ok: res.ok, status: res.status, contentType: ct, bodyKind, body };
  } catch (e: any) {
    return { name, ok: false, status: 0, error: String(e?.message || e), contentType: null, bodyKind: 'none' };
  }
}

export async function edgeHealth() {
  // Minimal payloads. Functions should handle graceful failure if OPENAI_API_KEY is absent.
  const chat = await callEdge('openai-chat', { messages: [{ role: 'user', content: 'ping' }] });
  const food = await callEdge('openai-food-macros', { foodName: '2 eggs' });
  return { chat, food };
}