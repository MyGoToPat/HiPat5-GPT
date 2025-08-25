import React from 'react';

interface MacroBadgeProps {
  label: string;
  value: number;
  unit?: string;
  color?: string;
  className?: string;
}

export const MacroBadge: React.FC<MacroBadgeProps> = ({
  label,
  value,
  unit = 'g',
  color = 'bg-gray-100 text-gray-800',
  className = ''
}) => {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} ${className}`}>
      <span className="font-bold">{label}:</span>
      <span>{value}{unit}</span>
    </span>
  );
};