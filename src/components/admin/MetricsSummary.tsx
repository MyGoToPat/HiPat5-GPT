import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../lib/supabase';

type Counts = {
  total: number;
  admins: number;
  trainers: number;
  users: number;
  beta: number;
  last7d: number;
};

export default function MetricsSummary() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();
        // First attempt: role, beta_user, created_at
        let all: any[] | null = null;
        let queryError: any = null;

        const trySelect = async (cols: string) => {
          const { data, error } = await supabase
            .from('profiles')
            .select(cols);
          if (error) throw error;
          return data as any[];
        };

        try {
          all = await trySelect('role, beta_user, created_at');
        } catch (err: any) {
          queryError = err;
          const msg = err?.message?.toLowerCase?.() ?? '';
          const code = err?.code ?? '';
          // If beta_user column is missing, re-query without it
          if (msg.includes('column') && msg.includes('beta_user')) {
            try {
              all = await trySelect('role, created_at');
            } catch (err2: any) {
              queryError = err2;
            }
          }
        }

        if (!all) {
          const msg = queryError?.message ?? String(queryError ?? 'Unknown error');
          // If profiles table is missing, fail safe with a gentle message
          if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('profiles')) {
            setError('profiles table not found (migration not yet applied).');
            setCounts({ total: 0, admins: 0, trainers: 0, users: 0, beta: 0, last7d: 0 });
            return;
          }
          throw queryError ?? new Error(msg);
        }

        const total = all.length;
        const admins = all.filter(r => r.role === 'admin').length;
        const trainers = all.filter(r => r.role === 'trainer').length;
        const users = all.filter(r => r.role === 'user').length;
        const beta = all.filter(r => !!(r as any).beta_user).length;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const last7d = all.filter(r => {
          const ts = (r as any).created_at ? new Date((r as any).created_at) : null;
          return ts && ts >= sevenDaysAgo;
        }).length;

        setCounts({ total, admins, trainers, users, beta, last7d });
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div>Loading metrics…</div>;
  if (error) return <div className="text-yellow-700">Metrics: {error}</div>;
  if (!counts) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12 }}>
        <Card label="Total Users" value={counts.total} />
        <Card label="Admins" value={counts.admins} />
        <Card label="Trainers" value={counts.trainers} />
        <Card label="Users" value={counts.users} />
        <Card label="Beta Users" value={counts.beta} />
        <Card label="Joined (7d)" value={counts.last7d} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}