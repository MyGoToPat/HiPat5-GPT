import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AchievementBadges from "./profile/AchievementBadges";
import CustomizableHeader from "./profile/CustomizableHeader";
import { getSupabase, getUserProfile, upsertUserProfile, type ProfileRow } from "../lib/supabase";

// Simple progress placeholder (to match original dark UI tone)
function ProgressBar() {
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className="h-2 w-4/5 bg-blue-600" />
    </div>
  );
}

type FormState = {
  display_name?: string;
  height_cm?: string; // keep as string for input control
  weight_kg?: string;
  activity_level?: string;
};

export function ProfilePage({
  onNavigate,
}: {
  onNavigate?: (page: "chat" | "dashboard" | "tdee") => void;
}) {
  const [email, setEmail] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    display_name: "",
    height_cm: "",
    weight_kg: "",
    activity_level: "",
  });
  const sb = useMemo(() => getSupabase(), []);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await sb.auth.getUser();
        setEmail(auth?.user?.email ?? "");

        const row = await getUserProfile();
        if (row) {
          setForm({
            display_name: row.display_name ?? "",
            height_cm:
              row.height_cm != null ? String(row.height_cm) : "",
            weight_kg:
              row.weight_kg != null ? String(row.weight_kg) : "",
            activity_level: row.activity_level ?? "",
          });
        }
      } catch {
        // swallow UI errors; this page must never crash
      }
    })();
  }, [sb]);

  const onChange =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  const onSave = async () => {
    const patch: Partial<ProfileRow> = {
      display_name: (form.display_name ?? "").trim() || null,
      height_cm:
        form.height_cm && form.height_cm.trim() !== ""
          ? Number(form.height_cm)
          : null,
      weight_kg:
        form.weight_kg && form.weight_kg.trim() !== ""
          ? Number(form.weight_kg)
          : null,
      activity_level: (form.activity_level ?? "").trim() || null,
    };
    await upsertUserProfile(patch);
  };

  return (
    <div className="p-3">
      <CustomizableHeader
        title="Your Profile"
        email={email}
        onNavigate={(page) => onNavigate?.(page)}
      />

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 space-y-4">
        {/* Form row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Name */}
          <div className="lg:col-span-3">
            <label className="text-xs text-gray-400">Display name</label>
            <input
              className="mt-1 w-full rounded-md bg-gray-800 text-gray-100 border border-gray-700 px-3 py-2 text-sm placeholder-gray-500"
              placeholder="Your name"
              value={form.display_name}
              onChange={onChange("display_name")}
            />
          </div>

          {/* Height */}
          <div className="lg:col-span-3">
            <label className="text-xs text-gray-400">Height (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              className="mt-1 w-full rounded-md bg-gray-800 text-gray-100 border border-gray-700 px-3 py-2 text-sm placeholder-gray-500"
              placeholder="e.g. 178"
              value={form.height_cm}
              onChange={onChange("height_cm")}
            />
          </div>

          {/* Weight */}
          <div className="lg:col-span-3">
            <label className="text-xs text-gray-400">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="mt-1 w-full rounded-md bg-gray-800 text-gray-100 border border-gray-700 px-3 py-2 text-sm placeholder-gray-500"
              placeholder="e.g. 76"
              value={form.weight_kg}
              onChange={onChange("weight_kg")}
            />
          </div>

          {/* Activity level */}
          <div className="lg:col-span-3">
            <label className="text-xs text-gray-400">Activity level</label>
            <select
              className="mt-1 w-full rounded-md bg-gray-800 text-gray-100 border border-gray-700 px-3 py-2 text-sm"
              value={form.activity_level}
              onChange={onChange("activity_level")}
            >
              <option value="">—</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-750 text-sm text-gray-100 px-3 py-2"
            onClick={onSave}
          >
            Save changes
          </button>
          <Link
            to="/tdee"
            className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-750 text-sm text-gray-100 px-3 py-2"
          >
            Open TDEE
          </Link>
        </div>
      </div>

      {/* Progress & insights */}
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-200 text-sm font-medium">Progress</h3>
        </div>
        <ProgressBar />
        <div className="mt-4">
          <h4 className="text-gray-300 text-xs font-semibold mb-1">AI Insights</h4>
          <ul className="text-gray-300 text-xs list-disc pl-4 space-y-1">
            <li>Stay hydrated before workouts.</li>
            <li>Consistent sleep improves recovery and performance.</li>
            <li>Try a light activity on rest days for faster progress.</li>
          </ul>
        </div>
        <div className="mt-3">
          <AchievementBadges />
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;