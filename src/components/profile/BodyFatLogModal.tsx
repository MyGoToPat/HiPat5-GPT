import React, { useState, useEffect } from 'react';
import { X, Activity, Trash2, Calendar } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface BodyFatLog {
  id: string;
  body_fat_percent: number;
  log_date: string;
  note?: string;
  created_at: string;
}

interface BodyFatLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBodyFatLogged?: () => void;
  currentBodyFat?: number;
}

export const BodyFatLogModal: React.FC<BodyFatLogModalProps> = ({
  isOpen,
  onClose,
  onBodyFatLogged,
  currentBodyFat
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyFat, setBodyFat] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState<BodyFatLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRecentLogs();
      if (currentBodyFat && !bodyFat) {
        setBodyFat(currentBodyFat.toFixed(1));
      }
    }
  }, [isOpen, currentBodyFat]);

  const loadRecentLogs = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('body_fat_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error loading recent logs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bodyFatValue = parseFloat(bodyFat);

    if (!bodyFat || bodyFatValue <= 0 || bodyFatValue > 100) {
      toast.error('Please enter a valid body fat percentage (1-100)');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('body_fat_logs')
        .upsert({
          user_id: user.id,
          body_fat_percent: bodyFatValue,
          log_date: date,
          note: note || null
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) throw error;

      await supabase
        .from('user_metrics')
        .update({ body_fat_percent: bodyFatValue })
        .eq('user_id', user.id);

      toast.success('Body fat logged successfully!');
      setBodyFat('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      loadRecentLogs();
      if (onBodyFatLogged) onBodyFatLogged();
    } catch (error: any) {
      console.error('Error logging body fat:', error);
      toast.error(error.message || 'Failed to log body fat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Delete this body fat entry?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('body_fat_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      toast.success('Entry deleted');
      loadRecentLogs();
      if (onBodyFatLogged) onBodyFatLogged();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete entry');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Log Body Fat %</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-10 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Body Fat Percentage
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="100"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="e.g., 15.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this measurement..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Logging...' : 'Log Body Fat'}
              </button>
            </div>
          </form>

          {recentLogs.length > 0 && (
            <div className="border-t border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Entries</h3>
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <div className="text-white font-medium">{log.body_fat_percent}%</div>
                      <div className="text-xs text-gray-400">{formatDate(log.log_date)}</div>
                      {log.note && (
                        <div className="text-xs text-gray-500 mt-1">{log.note}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
