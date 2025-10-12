import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '../../lib/announcements';
import { useAuth } from '../../hooks/useAuth';

export function InboxBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user || unreadCount === 0) {
    return (
      <button
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      aria-label={`${unreadCount} unread notifications`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
