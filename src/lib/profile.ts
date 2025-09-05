import supabase from "./supabase";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  sex: string | null;
  dob: string | null;
  updated_at?: string | null;
};

export async function getAuthedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function fetchMyProfile(): Promise<ProfileRow | null> {
  const user = await getAuthedUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*") // schema-tolerant: avoid unknown-column errors
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const r: any = data;
  // Normalize with graceful fallbacks for older column names
  const normalized: ProfileRow = {
    id: r.id,
    display_name: r.display_name ?? null,
    avatar_url: r.avatar_url ?? null,
    height_cm: (r.height_cm ?? r.height) ?? null,
    weight_kg: (r.weight_kg ?? r.weight) ?? null,
    activity_level: (r.activity_level ?? r.activity) ?? null,
    sex: (r.sex ?? r.gender) ?? null,
    dob: (r.dob ?? r.date_of_birth) ?? null,
    updated_at: r.updated_at ?? null,
  };
  return normalized;
}

export async function upsertMyProfile(patch: Partial<ProfileRow>) {
  const user = await getAuthedUser();
  if (!user) throw new Error("No authenticated user.");

  const payload = { id: user.id, ...patch };

  const { data, error } = await supabase
    .from("profiles")
    .upsert([payload])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}