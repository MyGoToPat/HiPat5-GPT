import React from 'react';
import { getSupabase } from '../lib/supabase';

export default function UserMenu({ email }: { email: string }) {
  const supabase = getSupabase();
  async function signOut() { await supabase.auth.signOut(); }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="opacity-70">{email}</span>
      <button onClick={signOut} className="underline">Sign out</button>
    </div>
  );
}