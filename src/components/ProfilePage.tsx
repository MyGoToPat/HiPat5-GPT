import React, { useEffect, useMemo, useState } from 'react';
import { getUserProfile, upsertUserProfile, type ProfileRow } from '../lib/supabase';
import CustomizableHeader from './profile/CustomizableHeader';
import AchievementBadges from './profile/AchievementBadges';
import ProgressVisualizations from './profile/ProgressVisualizations';
import AIInsights from './profile/AIInsights';
import { Link } from 'react-router-dom';

type Props = {
  onNavigate?: (page: string) => void;
};

type Form = {
  display_name?: string;
  height_cm?: string | number | null;
  weight_kg?: string | number | null;
  activity_level?: string | null;
};

const fieldBox =
  'flex-1 rounded-md bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600';

export const ProfilePage: React.FC<Props> = ({ onNavigate }) => {
  const [email, setEmail] = useState<string>('');
  const [form, setForm] = useState<Form>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const actions = useMemo(
    () => (
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 px-3 py-2 text-sm text-gray-100"
          onClick={() => onNavigate?.('chat')}
        >
          Chat with Pat
        </button>
        <button
          className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 px-3 py-2 text-sm text-gray-100"
          onClick={() => onNavigate?.('dashboard')}
        >
          View Dashboard
        </button>
        <button
          className="rounded-lg border border-blue-700 bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm text-white"
          onClick={() => onNavigate?.('tdee')}
        >
          Run TDEE
        </button>
      </div>
    ),
    [onNavigate]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const row = await getUserProfile();
      if (row) {
        // tolerate older column names via nullish coalescing
        setEmail((row as any)?.email ?? '');
        setForm({
          display_name: row.display_name ?? '',
          height_cm: (row as any).height_cm ?? (row as any).height ?? '',
          weight_kg: (row as any).weight_kg ?? (row as any).weight ?? '',
          activity_level: row.activity_level ?? null,
        });
      }
      setLoading(false);
    })();
  }, []);

  const onChange = (patch: Partial<Form>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    setSaving(true);
    const payload: Partial<ProfileRow> = {
      display_name: (form.display_name ?? '').toString(),
      // normalize to numbers or nulls
      height_cm:
        form.height_cm === '' || form.height_cm == null
          ? null
          : Number(form.height_cm),
      weight_kg:
        form.weight_kg === '' || form.weight_kg == null
          ? null
          : Number(form.weight_kg),
      activity_level: form.activity_level ?? null,
    };
    await upsertUserProfile(payload);
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading profile…</div>;
  }

  return (
    <div className="p-6">
      <CustomizableHeader title="Your Profile" subtitle={email} actions={actions} />

      {/* form card */}
      <div className="rounded-lg border border-gray-700 bg-gray-800">
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-gray-400">
              Display name
              <input
                className={`${fieldBox} mt-1`}
                value={form.display_name ?? ''}
                onChange={(e) => onChange({ display_name: e.target.value })}
                placeholder="Your name"
              />
            </label>

            <label className="text-xs text-gray-400">
              Height (cm)
              <input
                className={`${fieldBox} mt-1`}
                inputMode="numeric"
                value={form.height_cm ?? ''}
                onChange={(e) => onChange({ height_cm: e.target.value })}
                placeholder="e.g. 178"
              />
            </label>

            <label className="text-xs text-gray-400">
              Weight (kg)
              <input
                className={`${fieldBox} mt-1`}
                inputMode="numeric"
                value={form.weight_kg ?? ''}
                onChange={(e) => onChange({ weight_kg: e.target.value })}
                placeholder="e.g. 76"
              />
            </label>
          </div>

          <label className="text-xs text-gray-400">
            Activity level
            <select
              className={`${fieldBox} mt-1`}
              value={form.activity_level ?? ''}
              onChange={(e) => onChange({ activity_level: e.target.value || null })}
            >
              <option value="">—</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              className="rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <Link
              to="/tdee"
              className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-750 text-sm text-gray-100 px-3 py-2"
            >
              Open TDEE
            </Link>
          </div>
        </div>
      </div>

      {/* progress + insights */}
      <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-sm font-medium text-gray-200 mb-3">Progress</h2>
        <ProgressVisualizations />
        <div className="mt-4">
          <h3 className="text-xs font-medium text-gray-400 mb-2">AI Insights</h3>
          <AIInsights />
        </div>
      </div>

      {/* badges */}
      <AchievementBadges
        badges={[
          { id: 'streak', label: '7-day consistency' },
          { id: 'hydration', label: 'Hydration habit' },
        ]}
      />
    </div>
  );
};

export default ProfilePage;