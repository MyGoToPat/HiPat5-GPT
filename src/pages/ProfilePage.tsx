import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchMyProfile, upsertMyProfile, getAuthedUser, type ProfileRow } from "../lib/profile";
import ProgressVisualizations from "../components/profile/ProgressVisualizations";
import AIInsights from "../components/profile/AIInsights";
import QuickActions from "../components/QuickActions";

type Form = {
  display_name?: string;
  height_cm?: number | "";
  weight_kg?: number | "";
  activity_level?: string;
};

const ProfilePage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [form, setForm] = useState<Form>({ display_name: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await getAuthedUser();
        setEmail(user?.email ?? "");
        const row = await fetchMyProfile();
        if (row) {
          setForm({
            display_name: row.display_name ?? "",
            height_cm: row.height_cm ?? "",
            weight_kg: row.weight_kg ?? "",
            activity_level: row.activity_level ?? "",
          });
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (k: keyof Form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    try {
      await upsertMyProfile({
        display_name: form.display_name ?? null,
        height_cm: form.height_cm === "" ? null : Number(form.height_cm),
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
        activity_level: form.activity_level ?? null,
      });
      toast.success("Profile saved");
    } catch (e: any) {
      console.error(e);
      toast.error("Save failed");
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading profile…</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-gray-100">Your Profile</h1>
        <p className="text-xs text-gray-400">{email}</p>
      </header>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs text-gray-400">
            Display name
            <input
              className="mt-1 w-full rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none border border-gray-700"
              value={form.display_name ?? ""}
              onChange={(e) => update("display_name", e.target.value)}
            />
          </label>

          <label className="text-xs text-gray-400">
            Height (cm)
            <input
              className="mt-1 w-full rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none border border-gray-700"
              type="number"
              value={form.height_cm ?? ""}
              onChange={(e) => update("height_cm", e.target.value)}
            />
          </label>

          <label className="text-xs text-gray-400">
            Weight (kg)
            <input
              className="mt-1 w-full rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none border border-gray-700"
              type="number"
              value={form.weight_kg ?? ""}
              onChange={(e) => update("weight_kg", e.target.value)}
            />
          </label>
        </div>

        <label className="block text-xs text-gray-400">
          Activity level
          <select
            className="mt-1 w-full rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none border border-gray-700"
            value={form.activity_level ?? ""}
            onChange={(e) => update("activity_level", e.target.value)}
          >
            <option value="">—</option>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </select>
        </label>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onSave}
            className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 px-4 py-2 text-sm text-gray-100"
          >
            Save changes
          </button>

          <a
            href="/tdee"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-100"
          >
            Open TDEE
          </a>
        </div>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-medium text-gray-200 mb-2">Progress</h2>
        <ProgressVisualizations />
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-medium text-gray-200 mb-2">AI Insights</h2>
        <AIInsights />
      </section>

      <QuickActions />
    </div>
  );
};

export default ProfilePage;