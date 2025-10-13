import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface UserMenuProps {
  email: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const supabase = getSupabase();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLow, setIsLow] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  async function loadBalance() {
    try {
      const { data } = await supabase.from('v_user_credits').select('balance_usd, is_unlimited, plan').maybeSingle();
      if (data) {
        const unlimited = data.is_unlimited || false;
        setIsUnlimited(unlimited);
        if (unlimited) {
          setBalance(null);
          setIsLow(false);
        } else {
          const bal = data.balance_usd || 0;
          setBalance(bal);
          setIsLow(bal < 0.20);
        }
      }
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link to="/profile?tab=usage" className="relative flex items-center gap-2 hover:opacity-80">
        {isUnlimited ? (
          <span className="font-medium text-green-600">
            ∞ Unlimited
          </span>
        ) : (
          <>
            <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
              {balance !== null ? `$${balance.toFixed(2)}` : '...'}
            </span>
            {isLow && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full" title="Low credits"></span>
            )}
          </>
        )}
      </Link>
      <span className="opacity-70">{email}</span>
      <button onClick={signOut} className="underline hover:no-underline">
        Sign out
      </button>
    </div>
  );
}