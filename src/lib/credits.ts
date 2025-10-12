import { supabase } from './supabase';

export interface TokenWallet {
  user_id: string;
  balance_usd: number;
  plan: string;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  delta_usd: number;
  reason: string;
  created_at: string;
}

export interface UserCredits {
  user_id: string;
  plan: string;
  balance_usd: number;
  month_delta_usd: number;
}

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabase
    .from('v_user_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[credits] Error fetching user credits:', error);
    return null;
  }

  return data;
}

export async function addCredits(amountUsd: number, reason: string): Promise<number> {
  const { data, error } = await supabase.rpc('add_credits', {
    p_amount_usd: amountUsd,
    p_reason: reason
  });

  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`);
  }

  return data as number;
}

export async function spendCredits(amountUsd: number, reason: string): Promise<number> {
  const { data, error } = await supabase.rpc('spend_credits', {
    p_amount_usd: amountUsd,
    p_reason: reason
  });

  if (error) {
    if (error.message?.includes('Insufficient credits')) {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    throw new Error(`Failed to spend credits: ${error.message}`);
  }

  return data as number;
}

export async function getTransactionHistory(userId: string, limit = 50): Promise<TokenTransaction[]> {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[credits] Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

export const PRICING = {
  AMA_TURN: 0.02,
  IMAGE_ANALYSIS: 0.05,
  VOICE_MINUTE: 0.01,
  MONTHLY_FREE_CREDITS: 2.0
} as const;
