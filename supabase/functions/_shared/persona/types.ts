import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Draft = {
  content: string;
  meta: Record<string, any>;
};

export type Ctx = {
  supabase: SupabaseClient;
  user_id?: string;
};

export type Step = {
  slug: string;
  run: (draft: Draft, ctx: Ctx) => Promise<Draft> | Draft;
};