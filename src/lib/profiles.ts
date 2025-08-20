import { getSupabase } from './supabase';

export async function ensureProfile(userId: string, email?: string): Promise<void> {
  try {
    // Check if profile exists
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!data) {
      const handle = (email || '').split('@')[0] || 'user';
      const { error: insErr } = await getSupabase().from('profiles').insert({
        user_id: userId,
        email,
        display_name: handle,
        name: handle, // tolerate NOT NULL name schemas
      });
      if (insErr && insErr.code !== '23505') {
        console.warn('[ensureProfile] insert error', insErr);
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.warn('[ensureProfile] select error', error);
    }
  } catch (e) {
    console.warn('[ensureProfile] failed', e);
  }
}