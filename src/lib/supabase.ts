import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Set it in the environment.');
}
if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY. Set it in the environment.');
}

// Mask anon key in logs
const masked = supabaseAnonKey.slice(0, 6) + '...' + supabaseAnonKey.slice(-6);
console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] ANON (masked):', masked);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get current user
export const getCurrentUser = async () => {
  console.log('getCurrentUser: Starting auth.getUser() call');

  console.log('getCurrentUser: Executing Supabase auth.getUser()...');
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('getCurrentUser: auth.getUser() promise resolved/rejected.');
  console.log('getCurrentUser: Completed auth.getUser() call - User:', user, 'Error:', error);
  if (error) {
    console.error('getCurrentUser: Error occurred:', error);
    console.error('getCurrentUser: Error message:', error.message);
    console.error('getCurrentUser: Error code:', error.code);
    throw error;
  }
  console.log('getCurrentUser: Returning user:', user);
  return user;
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  console.log('getUserProfile: Starting profile fetch for userId:', userId);

  let data, error;
  try {
    console.log('getUserProfile: About to call supabase.from(profiles).select().eq().single()');
    console.log('getUserProfile: Executing Supabase query...');
    
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('getUserProfile: Supabase query promise resolved/rejected.');
    data = result.data;
    error = result.error;
    console.log('getUserProfile: Supabase call completed successfully');
  } catch (supabaseError) {
    console.error('getUserProfile: Supabase call threw an exception:', supabaseError);
    console.error('getUserProfile: Exception message:', supabaseError instanceof Error ? supabaseError.message : 'Unknown');
    console.error('getUserProfile: Exception code:', (supabaseError as any)?.code || 'No code');
    console.error('getUserProfile: Full exception object:', supabaseError);
    throw supabaseError;
  }
  
  console.log('getUserProfile: Profile fetch completed - Data:', data, 'Error:', error);
  
  if (error) {
    console.log('getUserProfile: Error present - Code:', error.code, 'Message:', error.message);
    console.log('getUserProfile: Full error object:', error);
    if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('getUserProfile: Unexpected error occurred:', error);
    throw error;
    }
  }
  
  console.log('getUserProfile: Returning profile data:', data);
  return data;
};

// Helper function to create or update user profile
export const upsertUserProfile = async (userId: string, profileData: any) => {
  console.log('upsertUserProfile: Starting upsert for userId:', userId, 'with data:', profileData);

  let data, error;
  try {
    console.log('upsertUserProfile: About to call supabase.from(profiles).upsert()');
    console.log('upsertUserProfile: Executing Supabase upsert...');
    const upsertData = {
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    };
    console.log('upsertUserProfile: Upsert data prepared:', upsertData);
    
    const result = await supabase
      .from('profiles')
      .upsert(upsertData, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    console.log('upsertUserProfile: Supabase upsert promise resolved/rejected.');
    data = result.data;
    error = result.error;
    console.log('upsertUserProfile: Supabase upsert call completed successfully');
  } catch (supabaseError) {
    console.error('upsertUserProfile: Supabase upsert call threw an exception:', supabaseError);
    console.error('upsertUserProfile: Exception message:', supabaseError instanceof Error ? supabaseError.message : 'Unknown');
    console.error('upsertUserProfile: Exception code:', (supabaseError as any)?.code || 'No code');
    console.error('upsertUserProfile: Full exception object:', supabaseError);
    throw supabaseError;
  }
  
  console.log('upsertUserProfile: Upsert completed - Data:', data, 'Error:', error);
  
  if (error) {
    console.error('upsertUserProfile: Error present - Code:', error.code, 'Message:', error.message);
    console.error('upsertUserProfile: Full error object:', error);
    console.error('upsertUserProfile: Error during upsert:', error);
    throw error;
  }
  console.log('upsertUserProfile: Returning upserted profile:', data);
  return data;
};