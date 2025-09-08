import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  backTo?: string;       // default '/admin/agents'
  right?: React.ReactNode; // actions slot
};

const label = (seg: string) => {
  if (seg === 'admin') return 'Admin';
  if (seg === 'agents') return 'Agents';
  if (seg === 'sandbox') return 'Sandbox';
  return seg; // fallback (e.g., slug)
};

const AdminHeader: React.FC<Props> = ({ title, subtitle, backTo = '/admin/agents', right }) => {
  const { pathname } = useLocation();
  const crumbs = pathname.split('/').filter(Boolean).slice(0, 3); // e.g., ['admin','agents','sandbox'|':slug']

  return (
    <div className="mb-4 border-b border-neutral-800 pb-3 flex items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              <span>{label(c)}</span>
              {i < crumbs.length - 1 && <span className="text-neutral-600">›</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to={backTo} className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200">
            ← Back
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
            {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
          </div>
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
};

export default AdminHeader;