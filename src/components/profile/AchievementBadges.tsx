```tsx
import React from "react";

type Badge = { label: string };

export default function AchievementBadges({
  badges = [
    { label: "7-day consistency" },
    { label: "Hydration habit" },
  ],
}: { badges?: Badge[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-gray-800 text-gray-200 text-xs px-2 py-1 border border-gray-700"
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
```