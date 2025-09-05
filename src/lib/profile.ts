// src/lib/profile.ts
import { supabase } from './supabase'; // Using existing client

export type ProfileRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  dob?: string | null;
  sex?: 'male' | 'female' | 'other' | null;
  activity_level?: string | null;
  updated_at?: string | null;
};

export async function getAuthedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function fetchMyProfile(): Promise<ProfileRow | null> {
  const user = await getAuthedUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertMyProfile(patch: Partial<ProfileRow>) {
  const user = await getAuthedUser();
  const row: Partial<ProfileRow> = { id: user.id, ...patch };
  const { data, error } = await supabase.from('profiles').upsert(row).select().single();
  if (error) throw error;
  return data;
}