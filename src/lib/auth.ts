import { supabase } from './supabase';

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session ?? null, error };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
}