import React from 'react';
import { X, Edit, Mic, BarChart3, User, Users, Settings, Zap } from 'lucide-react';
import { NAV_ITEMS } from '../config/navItems';
import { useRole } from '../hooks/useRole';

type ChatSummary = { id: string; title: string | null; updated_at: string | null; };
type UserProfile = { role?: 'admin' | 'trainer' | 'user' | string } | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  recentChats: ChatSummary[];
  userProfile?: UserProfile;
};

export default function NavigationSidebar({ isOpen, onClose, onNavigate, recentChats, userProfile }: Props) {
  const { can } = useRole();
  
  if (!isOpen) return null;

  const role = (userProfile?.role ?? 'user') as 'admin' | 'trainer' | 'user';

  const primary   = NAV_ITEMS.filter(i => i.section === 'primary' && (!i.roles || i.roles.includes(role)) && (!i.requirePrivilege || can(i.requirePrivilege)));
  const admin     = NAV_ITEMS.filter(i => i.section === 'admin' && (!i.roles || i.roles.includes(role)) && (!i.requirePrivilege || can(i.requirePrivilege)));
  const utilities = NAV_ITEMS.filter(i => i.section === 'utilities' && (!i.roles || i.roles.includes(role)) && (!i.requirePrivilege || can(i.requirePrivilege)));

  const iconFor = (label: string) => {
    switch (label) {
      case 'New chat': return Edit;
      case 'Talk With Pat': return Mic;
      case 'Dashboard': return BarChart3;
      case 'Profile': return User;
      case 'Client Management': return Users;
      case 'Admin Agents': return Settings;
      case 'User Management': return Settings;
      case 'TDEE Calculator': return Zap;
      default: return undefined;
    }
  };

  const Row = ({ label, to }: { label: string; to: string }) => {
    const Icon = iconFor(label);
    return (
      <button
        onClick={() => { onNavigate(to); onClose(); }}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-3"
      >
        {Icon ? <Icon size={16} className="text-gray-600" /> : null}
        <span className="font-medium text-gray-800">{label}</span>
      </button>
    );
  };

  const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <div className="mb-3">
      {title ? <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-500">{title}</div> : null}
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-[320px] max-w-[85vw] bg-white text-gray-900 shadow-xl flex flex-col">
        <div className="flex items-center justify-between h-12 px-4 border-b">
          <div className="text-sm font-semibold">Menu</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Section>
            {primary.map(i => <Row key={i.key} label={i.label} to={i.path} />)}
          </Section>

          {admin.length > 0 && (
            <Section title="Admin">
              {admin.map(i => <Row key={i.key} label={i.label} to={i.path} />)}
            </Section>
          )}

          <Section title="Utilities">
            {utilities.map(i => <Row key={i.key} label={i.label} to={i.path} />)}
          </Section>

          <Section title="Recent Chats">
            {recentChats.length === 0 ? (
              <div className="px-2 py-1 text-xs text-gray-500">No chat history yet</div>
            ) : recentChats.map(chat => (
              <Row key={chat.id} label={chat.title ?? 'Untitled'} to={`/chat?t=${encodeURIComponent(chat.id)}`} />
            ))}
          </Section>

          <div className="mt-3 px-2">
            <button
              className="w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
              onClick={() => { onNavigate('/login?signout=1'); onClose(); }}
            >
              Sign Out
            </button>
          </div>
        </nav>
      </aside>
    </div>
  );
}