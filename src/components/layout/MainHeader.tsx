import React from 'react';
import { Menu } from 'lucide-react';

type MainHeaderProps = {
  title: string;
  onMenuToggle: () => void;
};

const MainHeader: React.FC<MainHeaderProps> = ({ title, onMenuToggle }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-11 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
      <div className="w-8" />
      <h1 className="text-xs font-semibold text-gray-900 tracking-wide">{title}</h1>
      <button
        onClick={onMenuToggle}
        className="p-1 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-900" />
      </button>
    </header>
  );
};

export default MainHeader;