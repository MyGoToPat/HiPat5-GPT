import React from 'react';

export default function CustomizableHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-gray-100">{title}</h1>
        {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}