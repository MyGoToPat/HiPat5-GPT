export async function edgeHealth() {
  const base = import.meta.env.VITE_SUPABASE_URL!;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

  const headers = {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  } as const;

  // CHAT check
  const chatRes = await fetch(`${base}/functions/v1/openai-chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
  }).catch(() => null);

  // FOOD check — IMPORTANT: send a valid body
  const foodRes = await fetch(`${base}/functions/v1/openai-food-macros`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ foodName: 'banana' }),
  }).catch(() => null);

  const toItem = (name: string, r: Response | null) => ({
    name,
    ok: !!r && r.ok,
    status: r?.status ?? 0,
    bodyKind: 'json' as const,
  });

  return {
    chat: toItem('openai-chat', chatRes),
    food: toItem('openai-food-macros', foodRes),
  };
}