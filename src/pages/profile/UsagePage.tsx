import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CreditInfo {
  balance: number;
  plan: string;
  monthly_spent: number;
}

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export default function UsagePage() {
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [creditsRes, transactionsRes] = await Promise.all([
        supabase.from('v_user_credits').select('*').maybeSingle(),
        supabase.from('token_transactions').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (creditsRes.data) {
        setCredits({
          balance: creditsRes.data.balance || 0,
          plan: creditsRes.data.plan || 'free',
          monthly_spent: creditsRes.data.monthly_spent || 0
        });
      }

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }
    } catch (err) {
      console.error('Error loading usage data:', err);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }

  async function handleTopUp(amount: number, pack: string) {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('add_credits', {
        amount,
        reason: pack
      });

      if (error) throw error;

      toast.success(`Added $${amount.toFixed(2)} credits`);
      setShowTopUp(false);
      await loadData();
    } catch (err) {
      console.error('Top-up error:', err);
      toast.error('Failed to add credits');
    } finally {
      setProcessing(false);
    }
  }

  async function handleUnlimited() {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('token_wallets')
        .update({ plan: 'unlimited' })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Upgraded to Unlimited plan');
      setShowTopUp(false);
      await loadData();
    } catch (err) {
      console.error('Unlimited upgrade error:', err);
      toast.error('Failed to upgrade plan');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isLow = (credits?.balance || 0) < 0.20;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Credits & Usage</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Current Balance</div>
          <div className={`text-3xl font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
            ${credits?.balance.toFixed(2) || '0.00'}
          </div>
          {isLow && (
            <div className="text-xs text-red-600 mt-1">Low balance</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Plan</div>
          <div className="text-3xl font-bold text-gray-900 capitalize">
            {credits?.plan || 'Free'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">This Month</div>
          <div className="text-3xl font-bold text-gray-900">
            ${credits?.monthly_spent.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <button
          onClick={() => setShowTopUp(true)}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add Credits
        </button>
      </div>

      {showTopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Top Up Credits</h2>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleTopUp(2.00, 'pack_6')}
                disabled={processing}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-bold text-lg">$6 Package</div>
                <div className="text-sm text-gray-600">Add $2.00 credits</div>
              </button>

              <button
                onClick={() => handleTopUp(10.00, 'pack_19')}
                disabled={processing}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-bold text-lg">$19 Package</div>
                <div className="text-sm text-gray-600">Add $10.00 credits</div>
              </button>

              <button
                onClick={handleUnlimited}
                disabled={processing}
                className="w-full p-4 border-2 border-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="font-bold text-lg text-blue-600">$49/month Unlimited</div>
                <div className="text-sm text-gray-600">No balance deductions</div>
              </button>
            </div>

            <button
              onClick={() => setShowTopUp(false)}
              disabled={processing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tx.reason}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No transactions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
