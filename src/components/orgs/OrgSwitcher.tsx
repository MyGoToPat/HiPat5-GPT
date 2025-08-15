import React, { useEffect } from 'react';
import { useOrgStore } from '../../store/org';

export default function OrgSwitcher() {
  const { orgs, currentOrgId, setActiveOrg, loading } = useOrgStore();

  if (loading) return null; // Hide switcher while loading orgs
  if (orgs.length === 0) return null; // Hide switcher if no orgs

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Org</span>
      {/* Only render if there are orgs */}
        <select
          className="border rounded px-2 py-1 text-sm"
          value={currentOrgId ?? ''}
          onChange={(e) => setActiveOrg(e.target.value)}
        >
          <option value="" disabled>Select org…</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
    </div>
  );
}