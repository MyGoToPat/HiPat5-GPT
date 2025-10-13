import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  audience: 'all' | 'beta' | 'admin';
  created_at: string;
  is_read: boolean;
}

interface InboxPanelProps {
  onClose: () => void;
}

export function InboxPanel({ onClose }: InboxPanelProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .in('audience', ['all', 'beta', 'admin'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!announcementsData) return;

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);

      setAnnouncements(
        announcementsData.map(a => ({
          ...a,
          is_read: readIds.has(a.id)
        }))
      );
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(announcementId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('announcement_reads').insert({
        user_id: user.id,
        announcement_id: announcementId
      });

      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-600" />;
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  }

  function getSeverityBg(severity: string) {
    switch (severity) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-hidden flex flex-col mt-16">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          )}

          {!loading && announcements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No notifications yet
            </div>
          )}

          {!loading && announcements.map(announcement => (
            <div
              key={announcement.id}
              className={`mb-3 p-4 rounded-lg border ${getSeverityBg(announcement.severity)} ${
                !announcement.is_read ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(announcement.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    {!announcement.is_read && (
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {announcement.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {!announcement.is_read && (
                      <button
                        onClick={() => markAsRead(announcement.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
