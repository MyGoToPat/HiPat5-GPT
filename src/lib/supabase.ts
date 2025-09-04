import { createClient } from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined) ??
  'https://jdtogitfqptdrxkczdbw.supabase.co';

const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdG9naXRmcXB0ZHJ4a2N6ZGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTU0NTQsImV4cCI6MjA3MDUzMTQ1NH0.V7KN9mE1YlPYQZmWz-UO2vUqpTnoX6ZvyDoytYlucF8';

export const supabase = createClient(url, key);
export const getSupabase = () => supabase;
export default supabase;