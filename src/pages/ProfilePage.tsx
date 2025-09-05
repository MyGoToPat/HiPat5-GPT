// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import QuickActions from '../components/QuickActions';
import ProgressVisualizations from '../components/profile/ProgressVisualizations';
import AIInsights from '../components/profile/AIInsights';
import { fetchMyProfile, upsertMyProfile, getAuthedUser, type ProfileRow } from '../lib/profile';

type Form = {
  display_name: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
};

const ProfilePage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [form, setForm] = useState<Form>({ display_name: '' });
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const user = await getAuthedUser();
        setEmail(user?.email ?? '');
        const prof = await fetchMyProfile();
        setForm({
          display_name: prof?.display_name ?? '',
          height_cm: prof?.height_cm ?? null,
          weight_kg: prof?.weight_kg ?? null,
          activity_level: prof?.activity_level ?? null,
        });
        setAvatarUrl(prof?.avatar_url ?? '');
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSave = useMemo(() => !saving && !loading, [saving, loading]);

  async function onSave() {
    try {
      setSaving(true);
      await upsertMyProfile({
        display_name: form.display_name || null,
        height_cm: form.height_cm ?? null,
        weight_kg: form.weight_kg ?? null,
        activity_level: form.activity_level ?? null,
        avatar_url: avatarUrl || null,
      });
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-300">Loading profile…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Your Profile</h1>
          <p className="text-sm text-gray-400">{email}</p>
        </div>
        <QuickActions />
      </div>

      {/* Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gray-800 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-500">👤</div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Display name</label>
              <input
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100 outline-none"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Height (cm)</label>
              <input
                type="number"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100"
                value={form.height_cm ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_cm: e.target.value ? Number(e.target.value) : null }))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100"
                value={form.weight_kg ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weight_kg: e.target.value ? Number(e.target.value) : null }))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Activity level</label>
              <select
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100"
                value={form.activity_level ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, activity_level: e.target.value || null }))}
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

          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={!canSave}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm text-white"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <a href="/tdee" className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-100">
              Open TDEE
            </a>
            {savedAt ? <span className="text-xs text-gray-500">Saved</span> : null}
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Progress</h2>
            <div className="mt-2"><ProgressVisualizations /></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">AI Insights</h2>
            <div className="mt-2"><AIInsights /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;