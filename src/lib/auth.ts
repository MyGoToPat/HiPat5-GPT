import { supabase } from '../lib/supabase';

export async function signInWithPassword(email: string, password: string) {
  console.log('[auth] signInWithPassword →', { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('[auth] signInWithPassword result:', { session: !!data?.session, user: data?.user?.id, error });
  return { session: data?.session ?? null, user: data?.user ?? null, error };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  console.log('[auth] getSession →', { session: !!data.session, user: data.session?.user?.id });
  return data.session ?? null;
}

export async function onAuthChange(cb: (event: string, session: any) => void) {
  console.log('[auth] onAuthStateChange: subscribing');
  const sub = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[auth] event:', event, 'user:', session?.user?.id);
    cb(event, session);
  });
  return () => sub.data.subscription.unsubscribe();
}

export async function signOut() {
  console.log('[auth] signOut');
  await supabase.auth.signOut();
}