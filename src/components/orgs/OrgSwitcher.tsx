import React, { useEffect } from 'react';
import { useOrgStore } from '../../store/org';

export default function OrgSwitcher() {
  const { orgs, currentOrgId, fetchMyOrgs, setActiveOrg } = useOrgStore();

  useEffect(() => { 
    fetchMyOrgs(); 
  }, [fetchMyOrgs]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Org</span>
      {orgs.length > 0 ? (
        <select
          className="border rounded px-2 py-1 text-sm"
          value={currentOrgId ?? ''}
          onChange={(e) => setActiveOrg(e.target.value)}
        >
          <option value="" disabled>Select org…</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      ) : (
        <span className="text-xs text-gray-400">Organizations not enabled</span>
      )}
    </div>
  );
}