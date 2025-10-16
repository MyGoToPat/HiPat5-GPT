import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import NavigationSidebar from '../components/NavigationSidebar';
import TDEEGuard from '../components/auth/TDEEGuard';
import { ChatManager } from '../utils/chatManager';
import { getSupabase, getUserProfile } from '../lib/supabase';

type ChatSummary = {
  id: string;
  title: string | null;
  updated_at: string | null;
};

type UserProfile = { role?: 'admin' | 'trainer' | 'user' | string } | null;
function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/roles')) return 'Role Access';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/shoplens')) return 'ShopLens';
  if (pathname.startsWith('/admin/diagnostics')) return 'Diagnostics';
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
  const [userProfile, setUserProfile] = useState<UserProfile>(null);

  // Load chats whenever location changes or sidebar opens
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!active || !user) return;

        const state = await ChatManager.loadChatState?.(user.id);
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

  // Load user profile for role-based navigation
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!active || !user) return;

        const profile = await getUserProfile(user.id);
        if (!active) return;
        
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to load user profile', err);
        if (active) setUserProfile(null);
      }
    })();
    return () => { active = false; };
  }, []);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MainHeader title={pageTitle} onMenuToggle={() => setIsNavOpen(true)} />

      <NavigationSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onNavigate={(path: string) => { setIsNavOpen(false); navigate(path); }}
        recentChats={chats}
        userProfile={userProfile}
      />

      {/* Padding to clear fixed header: 56px (14 * 4) on mobile, 64px (16 * 4) on sm+ */}
      <main className="flex-1 overflow-y-auto pt-14 sm:pt-16">
        <TDEEGuard>
          <Outlet />
        </TDEEGuard>
      </main>
    </div>
  );
}