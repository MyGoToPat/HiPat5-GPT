import { getSupabase } from '../supabase';

export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    if ((user as any).app_metadata?.roles?.includes('admin')) return true;
    if (user.email === 'info@hipat.app') return true;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    return profile?.role === 'admin';
  } catch { return false; }
}