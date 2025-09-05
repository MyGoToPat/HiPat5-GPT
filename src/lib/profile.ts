import supabase from "./supabase";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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
    .select(
      "id, display_name, avatar_url, height_cm, weight_kg, activity_level, sex, dob, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow) ?? null;
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