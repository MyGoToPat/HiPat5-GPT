import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://jdtogitfqptdrxkczdbw.supabase.co';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdG9naXRmcXB0ZHJ4a2N6ZGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTU0NTQsImV4cCI6MjA3MDUzMTQ1NH0.V7KN9mE1YlPYQZmWz-UO2vUqpTnoX6ZvyDoytYlucF8';

export const supabase = createClient(url, anon);
export function getSupabase() { return supabase; }