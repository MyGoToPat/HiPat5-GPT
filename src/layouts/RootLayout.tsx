import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import NavigationSidebar from '../components/NavigationSidebar';
import { ChatManager } from '../utils/chatManager';

type ChatSummary = {
  id: string;
  title: string | null;
  updated_at: string | null;
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/agents/')) return 'Agent Details';
  if (pathname.startsWith('/admin/agents')) return 'Agents';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin')) return 'Admin';
  if (pathname.startsWith('/chat')) return 'Chat';
  if (pathname.startsWith('/voice')) return 'Voice';
  if (pathname.startsWith('/camera')) return 'Camera';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/tdee')) return 'TDEE';
  if (pathname.startsWith('/trainer-dashboard')) return 'Trainer Dashboard';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'PAT';
}

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);

  // Load chats whenever location changes or sidebar opens
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const state = await ChatManager.loadChatState?.();
        if (!active || !state) return;

        // Defensive normalization across possible shapes:
        // - state.threads: [{ id, title, updated_at }]
        // - state.chatHistories: [{ id, title, updated_at }]
        const raw =
          (Array.isArray((state as any).threads) && (state as any).threads) ||
          (Array.isArray((state as any).chatHistories) && (state as any).chatHistories) ||
          [];

        const normalized: ChatSummary[] = raw.map((t: any) => ({
          id: t.id ?? t.thread_id ?? '',
          title: t.title ?? t.name ?? 'Untitled',
          updated_at: t.updated_at ?? t.modified_at ?? null,
        })).filter((c: ChatSummary) => !!c.id);

        setChats(normalized);
      } catch (err) {
        console.error('Failed to load chat state', err);
      }
    })();
    return () => { active = false; };
  }, [location.pathname, isNavOpen]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MainHeader title={pageTitle} onMenuToggle={() => setIsNavOpen(true)} />

      <NavigationSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onNavigate={(path: string) => { setIsNavOpen(false); navigate(path); }}
        recentChats={chats}
      />

      {/* pt-[44px] to clear fixed 44px header */}
      <main className="flex-1 overflow-y-auto pt-[44px]">
        <Outlet />
      </main>
    </div>
  );
}