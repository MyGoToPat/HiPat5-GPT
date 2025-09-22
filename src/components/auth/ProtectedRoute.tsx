import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getSupabase } from "../../lib/supabase";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setHasUser(!!user);
      if (!user) { if (alive) setLoading(false); return; }

      // SINGLE SOURCE OF TRUTH: server RPC
      const { data, error } = await supabase.rpc("has_app_access", { uid: user.id });
      const ok = !!data && !error;

      if (import.meta.env.DEV) console.log("[Gate:RPC]", { uid: user.id, ok, err: error?.message || null });

      if (alive) { setAllowed(ok); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!hasUser) return <Navigate to="/login" replace />;

  // Only redirect; do NOT signOut here
  if (!allowed) return <Navigate to="/beta-pending" replace />;

  return children;
}