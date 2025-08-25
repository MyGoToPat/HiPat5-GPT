export function parseBool(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string') return fallback;
  const s = v.toLowerCase().trim();
  return s === '' ? fallback : !['0','false','off','no'].includes(s);
}

export const FEATURE_SHOPLENS = parseBool(import.meta.env.VITE_FEATURE_SHOPLENS, true);