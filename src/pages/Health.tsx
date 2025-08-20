import { useEffect, useMemo, useState } from 'react';
import { dbHealth } from '../health/db';
import { edgeHealth } from '../health/edge';

type Report = Awaited<ReturnType<typeof dbHealth>> & { edge: Awaited<ReturnType<typeof edgeHealth>> };

export default function Health() {
  const [report, setReport] = useState<Report | null>(null);
  const writeTest = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('writeTest') === '1';
    } catch { return false; }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const db = await dbHealth(writeTest);
      const edge = await edgeHealth();
      if (mounted) setReport({ ...db, edge } as Report);
    })();
    return () => { mounted = false; };
  }, [writeTest]);

  if (!report) return <pre>running</pre>;
  // Redact noisy bodies to keep the page readable
  const clean = {
    env: report.env,
    session: report.session,
    reads: report.reads,
    writes: report.writes,
    edge: {
      chat: { name: report.edge.chat.name, ok: report.edge.chat.ok, status: report.edge.chat.status, bodyKind: report.edge.chat.bodyKind },
      food: { name: report.edge.food.name, ok: report.edge.food.ok, status: report.edge.food.status, bodyKind: report.edge.food.bodyKind },
    },
  };
  return <pre>{JSON.stringify(clean, null, 2)}</pre>;
}