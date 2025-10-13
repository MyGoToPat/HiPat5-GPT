import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InboxPanel } from './InboxPanel';

export function InboxBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: announcements } = await supabase
        .from('announcements')
        .select('id')
        .in('audience', ['all', 'beta', 'admin']);

      if (!announcements) return;

      const announcementIds = announcements.map(a => a.id);

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', announcementIds);

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);
      const unread = announcementIds.filter(id => !readIds.has(id));

      setUnreadCount(unread.length);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <InboxPanel
          onClose={() => {
            setShowPanel(false);
            loadUnreadCount();
          }}
        />
      )}
    </>
  );
}
