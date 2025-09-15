import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { AlertCenter } from '../dashboard/AlertCenter';
import { MetricAlert } from '../../types/metrics';

interface MainHeaderProps {
  title: string;
  onMenuToggle: () => void;
  alerts?: MetricAlert[];
  onDismissAlert?: (alertId: string) => void;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  title,
  onMenuToggle,
  alerts = [],
  onDismissAlert
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-11 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
      {/* Left side - empty for symmetry */}
      <div className="w-8"></div>
      
      {/* Center - App Title */}
      <h1 className="text-xs font-semibold text-gray-900 tracking-wide">
        {title}
        {import.meta?.env?.MODE !== 'production' && (
          <a href="/admin/agents" className="ml-2 underline text-xs opacity-70 hover:opacity-100">
            Admin → Agents
          </a>
        )}
      </h1>
      
      {/* Right side - Alert Center and Menu */}
      <div className="flex items-center gap-2">
        {alerts.length > 0 && onDismissAlert && (
          <AlertCenter 
            alerts={alerts} 
            onDismissAlert={onDismissAlert}
          />
        )}
        <button
          onClick={onMenuToggle}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-900" />
        </button>
      </div>
    </header>
  );
};