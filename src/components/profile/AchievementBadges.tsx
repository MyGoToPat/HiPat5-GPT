// (Sept-4 snapshot) src/components/profile/AchievementBadges.tsx
import React from 'react';

type Badge = { label: string; sub?: string };

const Item: React.FC<Badge> = ({ label, sub }) => (
  <div className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-3 py-1 text-xs text-gray-100">
    <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
    <span>{label}</span>
    {sub ? <span className="opacity-70">({sub})</span> : null}
  </div>
);

const AchievementBadges: React.FC = () => {
  const badges: Badge[] = [
    { label: '7-day consistency' },
    { label: 'Hydration habit' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b, i) => (
        <Item key={i} {...b} />
      ))}
    </div>
  );
};

export default AchievementBadges;