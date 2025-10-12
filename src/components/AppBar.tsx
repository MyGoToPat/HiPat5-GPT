import React, { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { InboxBell } from './common/InboxBell';
import { InboxModal } from './common/InboxModal';

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
  const [inboxOpen, setInboxOpen] = useState(false);

  return (
    <>
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
          {import.meta?.env?.MODE !== 'production' && (
            <a href="/admin/agents" className="ml-2 underline text-xs opacity-70 hover:opacity-100">
              Admin → Agents
            </a>
          )}
        </h1>

        <div className="flex items-center gap-2">
          <div onClick={() => setInboxOpen(true)}>
            <InboxBell />
          </div>
          <button
            onClick={onMenu}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-900" />
          </button>
        </div>
      </div>

      <InboxModal isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
    </>
  );
};