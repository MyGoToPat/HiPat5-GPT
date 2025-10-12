import { useState, useEffect } from 'react';
import { X, CheckCheck } from 'lucide-react';
import { getAnnouncements, markAnnouncementRead, type AnnouncementWithReadStatus } from '../../lib/announcements';
import { useAuth } from '../../hooks/useAuth';

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InboxModal({ isOpen, onClose }: InboxModalProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithReadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchAnnouncements = async () => {
      setLoading(true);
      const data = await getAnnouncements(user.id);
      setAnnouncements(data);
      setLoading(false);
    };

    fetchAnnouncements();
  }, [isOpen, user]);

  const handleMarkRead = async (id: string) => {
    if (!user) return;
    await markAnnouncementRead(user.id, id);
    setAnnouncements(prev =>
      prev.map(a => (a.id === id ? { ...a, is_read: true, read_at: new Date().toISOString() } : a))
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No announcements</div>
          ) : (
            <div className="divide-y">
              {announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className={`p-4 ${announcement.is_read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{announcement.body}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!announcement.is_read && (
                      <button
                        onClick={() => handleMarkRead(announcement.id)}
                        className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
