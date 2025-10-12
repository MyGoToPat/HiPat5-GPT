import React from 'react';
// Legacy import removed
const SWARM_TABS: any[] = [];

interface RoleTabsProps {
  value: string | null;
  onChange: (role: string | null) => void;
}

const RoleTabs: React.FC<RoleTabsProps> = ({ value, onChange }) => {
  const tabs = [
    { id: null, label: 'All' },
    ...SWARM_TABS.map(tab => ({ id: tab.id, label: tab.label }))
  ];

  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id ?? 'all'}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default RoleTabs;