export async function withBackoff<T>(fn: () => Promise<T>, opts?: { tries?: number, baseMs?: number }) {
  const tries = opts?.tries ?? 3;
  const base = opts?.baseMs ?? 600;
  let lastErr: any;
  
  for (let i = 0; i < tries; i++) {
    try { 
      return await fn(); 
    } catch (e: any) {
      lastErr = e;
      // If it looks like a 429/overloaded, back off
      const ms = base * Math.pow(2, i);
      await new Promise(r => setTimeout(r, ms));
    }
  }
  throw lastErr;
}