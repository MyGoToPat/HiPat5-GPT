import { supabase } from '@/lib/supabase';

export async function spendCredits(amount: number, reason: string): Promise<void> {
  try {
    // Check if user has unlimited plan first
    const { data: credits } = await supabase
      .from('v_user_credits')
      .select('is_unlimited, balance_usd, plan')
      .maybeSingle();

    // Short-circuit: unlimited users don't spend or get warnings
    if (credits?.is_unlimited) {
      console.log('[spendCredits] User has unlimited plan, skipping deduction');
      return;
    }

    const { error } = await supabase.rpc('spend_credits', {
      amount,
      reason
    });

    if (error) {
      console.error('Failed to spend credits:', error);
      return;
    }

    const { data: balance } = await supabase
      .from('v_user_credits')
      .select('balance_usd')
      .maybeSingle();

    if (balance && balance.balance_usd < 0.20) {
      await createLowCreditAnnouncement();
    }
  } catch (err) {
    console.error('Spend credits error:', err);
  }
}

async function createLowCreditAnnouncement(): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('announcements')
      .select('id')
      .eq('title', 'Low Credit Balance')
      .maybeSingle();

    if (existing) return;

    await supabase.from('announcements').insert({
      title: 'Low Credit Balance',
      message: 'Your credit balance is low. Top up now to continue using premium features.',
      audience: 'all',
      severity: 'warning'
    });
  } catch (err) {
    console.error('Failed to create low credit announcement:', err);
  }
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gemini-1.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
    'gemini-1.5-pro': { input: 1.25 / 1_000_000, output: 5.00 / 1_000_000 }
  };

  const rate = rates[model] || rates['gpt-4o-mini'];
  return (inputTokens * rate.input) + (outputTokens * rate.output);
}
