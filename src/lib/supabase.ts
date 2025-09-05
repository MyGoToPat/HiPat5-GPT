import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase client + typed helpers used across the app,
 * including Profile read/write helpers that the original Profile page consumed.
 */

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  sex: string | null;
  dob: string | null;
  updated_at: string | null;
};

type SupabaseDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
      };
    };
  };
};

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Primary client export (matches original app usage)
export const supabase: SupabaseClient<SupabaseDatabase> = createClient<SupabaseDatabase>(url, anon);
export default supabase;

// Original helpers the Profile page used
export function getSupabase(): SupabaseClient<SupabaseDatabase> {
  return supabase;
}

export async function getUserProfile(): Promise<ProfileRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('getUserProfile error', error);
    return null;
  }
  return (data as ProfileRow) ?? null;
}

export async function upsertUserProfile(payload: Partial<ProfileRow>): Promise<ProfileRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  const row: Partial<ProfileRow> = { id: userId, ...payload };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row as any)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('upsertUserProfile error', error);
    return null;
  }
  return (data as ProfileRow) ?? null;
}