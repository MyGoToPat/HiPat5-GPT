import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getUserCredits, getTransactionHistory, type UserCredits, type TokenTransaction } from '../../lib/credits';
import { useAuth } from '../../hooks/useAuth';

export function CreditsWallet() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [creditsData, txData] = await Promise.all([
      getUserCredits(user.id),
      getTransactionHistory(user.id, 10)
    ]);

    setCredits(creditsData);
    setTransactions(txData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Credits Wallet</h3>
          <button
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          <span className="text-3xl font-bold text-gray-900">
            {credits.balance_usd.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">USD</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
            {credits.plan.toUpperCase()}
          </span>
          {credits.month_delta_usd !== 0 && (
            <span className={`text-sm flex items-center gap-1 ${credits.month_delta_usd > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {credits.month_delta_usd > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  +${Math.abs(credits.month_delta_usd).toFixed(2)}
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  -${Math.abs(credits.month_delta_usd).toFixed(2)}
                </>
              )}
              <span className="text-gray-500">this month</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showHistory ? 'Hide' : 'Show'} Transaction History
        </button>

        {showHistory && (
          <div className="mt-4 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.reason}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.delta_usd > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.delta_usd > 0 ? '+' : ''}${tx.delta_usd.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
