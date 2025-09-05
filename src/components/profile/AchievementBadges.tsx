import React from 'react';

type Badge = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

export default function AchievementBadges({ badges }: { badges: Badge[] }) {
  if (!badges?.length) return null;

  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
      {badges.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-2 rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-2 text-sm text-gray-100"
          aria-label={`Achievement ${b.label}`}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-700/70">
            {b.icon ?? '⭐'}
          </span>
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}