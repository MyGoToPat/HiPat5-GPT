import React, { useState, useEffect } from 'react';
import { X, Scale, Trash2, Calendar } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface WeightLog {
  id: string;
  weight_kg: number;
  weight_lbs: number;
  log_date: string;
  note?: string;
  created_at: string;
}

interface WeightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeightLogged?: () => void;
  currentWeightKg?: number;
  useMetric?: boolean;
}

// Helper to get user's local date in YYYY-MM-DD format
const getUserLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  isOpen,
  onClose,
  onWeightLogged,
  currentWeightKg,
  useMetric = false
}) => {
  const [date, setDate] = useState(getUserLocalDate());
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState<WeightLog[]>([]);
  const [useKg, setUseKg] = useState(false); // Default to lbs

  useEffect(() => {
    if (isOpen) {
      loadRecentLogs();
      if (currentWeightKg && !weight) {
        setWeight(useKg ? currentWeightKg.toFixed(1) : (currentWeightKg * 2.20462).toFixed(1));
      }
    }
  }, [isOpen, currentWeightKg]);

  // Update weight display when unit changes
  useEffect(() => {
    if (weight && currentWeightKg) {
      const currentKg = useKg ? parseFloat(weight) : parseFloat(weight) / 2.20462;
      setWeight(useKg ? currentKg.toFixed(1) : (currentKg * 2.20462).toFixed(1));
    }
  }, [useKg]);

  const loadRecentLogs = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weight_logs')
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
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weightKg = useKg ? parseFloat(weight) : parseFloat(weight) / 2.20462;
      const weightLbs = useKg ? parseFloat(weight) * 2.20462 : parseFloat(weight);

      const { error } = await supabase
        .from('weight_logs')
        .upsert({
          user_id: user.id,
          weight_kg: weightKg,
          weight_lbs: weightLbs,
          logged_unit: useKg ? 'kg' : 'lbs',
          log_date: date,
          note: note || null
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) throw error;

      await supabase
        .from('user_metrics')
        .update({ weight_kg: weightKg })
        .eq('user_id', user.id);

      toast.success('Weight logged successfully!');
      setWeight('');
      setNote('');
      setDate(getUserLocalDate());
      loadRecentLogs();
      if (onWeightLogged) onWeightLogged();
    } catch (error: any) {
      console.error('Error logging weight:', error);
      toast.error(error.message || 'Failed to log weight');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Delete this weight entry?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      toast.success('Entry deleted');
      loadRecentLogs();
      if (onWeightLogged) onWeightLogged();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete entry');
    }
  };

  const formatWeight = (kg: number) => {
    return useKg ? `${kg.toFixed(1)} kg` : `${(kg * 2.20462).toFixed(1)} lbs`;
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
              <Scale size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Log Weight</h2>
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
                    max={getUserLocalDate()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-10 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-400">
                    Weight
                  </label>
                  <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setUseKg(false)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        !useKg
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      lbs
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseKg(true)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        useKg
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      kg
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={useKg ? 'e.g., 75.5' : 'e.g., 165.0'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
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
                  placeholder="Add a note about this weight..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Logging...' : 'Log Weight'}
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
                      <div className="text-white font-medium">{formatWeight(log.weight_kg)}</div>
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
