import React from 'react';
import { Menu } from 'lucide-react';

type MainHeaderProps = {
  title: string;
  onMenuToggle: () => void;
};

const MainHeader: React.FC<MainHeaderProps> = ({ title, onMenuToggle }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 shadow-sm">
      <div className="w-10" />
      <h1 className="text-sm sm:text-base font-semibold text-gray-900 tracking-wide truncate max-w-[200px] sm:max-w-none">{title}</h1>
      <button
        onClick={onMenuToggle}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
        aria-label="Open menu"
      >
        <Menu size={22} className="text-gray-700" />
      </button>
    </header>
  );
};

export default MainHeader;