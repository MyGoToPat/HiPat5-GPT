import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Verdict } from '../../types/shoplens';

interface RiskBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ 
  verdict, 
  size = 'md', 
  className = '' 
}) => {
  const getVerdictConfig = (verdict: Verdict) => {
    switch (verdict) {
      case 'safe':
        return {
          icon: CheckCircle,
          label: 'Safe',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          description: 'No concerning ingredients detected'
        };
      case 'caution':
        return {
          icon: AlertTriangle,
          label: 'Use Caution',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          description: 'Some ingredients may require attention'
        };
      case 'avoid':
        return {
          icon: XCircle,
          label: 'Avoid',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          description: 'Contains concerning ingredients'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return { container: 'px-2 py-1 text-xs', icon: 12 };
      case 'lg':
        return { container: 'px-4 py-3 text-base', icon: 20 };
      case 'md':
      default:
        return { container: 'px-3 py-2 text-sm', icon: 16 };
    }
  };

  const config = getVerdictConfig(verdict);
  const sizeClasses = getSizeClasses(size);
  const IconComponent = config.icon;

  return (
    <div 
      className={`inline-flex items-center gap-2 ${sizeClasses.container} font-medium rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      title={config.description}
      role="status"
      aria-label={`Safety verdict: ${config.label}. ${config.description}`}
    >
      <IconComponent size={sizeClasses.icon} />
      <span>{config.label}</span>
    </div>
  );
};