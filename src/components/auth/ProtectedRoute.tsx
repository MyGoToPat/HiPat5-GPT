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

      const { data: prof } = await supabase
        .from("profiles")
        .select("role, beta_user")
        .eq("user_id", user.id) // IMPORTANT: user_id, not id
        .single();

      const ok = !!(prof && (prof.role === "admin" || prof.beta_user === true));
      if (import.meta.env.DEV) console.log("[Gate]", { uid: user.id, role: prof?.role, beta: prof?.beta_user, allowed: ok });
      if (alive) { setAllowed(ok); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null; // keep blank while checking
  if (!hasUser) return <Navigate to="/login" replace />;

  if (!allowed) {
    (async () => { try { await getSupabase().auth.signOut(); } catch {} })();
    return <Navigate to="/beta-pending" replace />;
  }
  
  return children;
}