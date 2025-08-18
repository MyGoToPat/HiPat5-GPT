export async function safeFetchJSON<T>(
  path: string,
  opts: RequestInit = {},
  fallback: T,
  timeoutMs = 4000
): Promise<T> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const baseEnv = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
    const url = baseEnv ? `${baseEnv}${path.startsWith('/') ? path : `/${path}`}` : path;
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (_e) {
    return fallback;
  }
}