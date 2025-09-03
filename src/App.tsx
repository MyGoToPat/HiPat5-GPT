import React, { useEffect, useState } from 'react';
import { AppBar } from './components/AppBar';
import { NavigationSidebar } from './components/NavigationSidebar';
import { PatAvatar } from './components/PatAvatar';
import LoginForm from './components/LoginForm';
import UserMenu from './components/UserMenu';
import AgentsList from './components/AgentsList';
import { getSupabase } from './lib/supabase';

export default function App() {
  const supabase = getSupabase();
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen flex">
      <NavigationSidebar />
      <div className="flex-1">
        <AppBar />
        <main className="p-4">
          {!session ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <PatAvatar /><span>Welcome to HiPat</span>
              </div>
              <LoginForm />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PatAvatar />
                  <span>Signed in as <strong>{session.user.email}</strong></span>
                </div>
                <UserMenu email={session.user.email || ''} />
              </div>
              <AgentsList />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}