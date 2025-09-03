import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';

export default function LoginForm() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg('Signed in.');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Check your email to confirm your account (if confirmations are enabled).');
      }
    } catch (e:any) {
      setErr(e.message || 'Auth error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
      <h2 className="text-lg font-semibold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
      <input className="w-full border px-3 py-2 rounded" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
      <input className="w-full border px-3 py-2 rounded" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
      <button disabled={loading} className="border px-3 py-2 rounded w-full">{loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Sign up')}</button>
      <div className="text-sm">
        {mode === 'signin' ? (
          <button type="button" className="underline" onClick={()=>setMode('signup')}>Need an account? Sign up</button>
        ) : (
          <button type="button" className="underline" onClick={()=>setMode('signin')}>Have an account? Sign in</button>
        )}
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
      {msg && <div className="text-green-600 text-sm">{msg}</div>}
    </form>
  );
}