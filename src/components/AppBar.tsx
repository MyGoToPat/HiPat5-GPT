import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';

interface AppBarProps {
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
  showBack?: boolean;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  onBack,
  onMenu,
  showBack = false
}) => {
  return (
    <div className="flex items-center justify-between h-11 px-4 bg-white border-b border-gray-100">
      <div className="flex items-center">
        {showBack && (
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>
      
      <h1 className="text-xs font-semibold text-gray-900 tracking-wide">
        {title}
      </h1>
      
      <button
        onClick={onMenu}
        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Menu size={20} className="text-gray-900" />
      </button>
    </div>
  );
};