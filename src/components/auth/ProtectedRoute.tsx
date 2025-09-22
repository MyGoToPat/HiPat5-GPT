import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getSupabase } from "../../lib/supabase";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (import.meta.env.DEV) console.log("[Gate:DISABLED]", { uid: user?.id || null });
      if (alive) {
        setHasUser(!!user);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null;           // tiny blank while checking
  if (!hasUser) return <Navigate to="/login" replace />;

  // EMERGENCY: gate disabled — allow all authenticated users
  return children;
}