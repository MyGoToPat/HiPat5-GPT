// (Sept-4 snapshot) src/components/profile/CustomizableHeader.tsx
import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

const CustomizableHeader: React.FC<Props> = ({ title, subtitle, right }) => {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-400">{subtitle ?? 'Your Profile'}</div>
        <h1 className="text-xl font-semibold text-gray-100">{title}</h1>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
};

export default CustomizableHeader;