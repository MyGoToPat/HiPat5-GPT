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
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        setHasUser(!!user);
        if (!user) { 
          if (alive) setLoading(false); 
          return; 
        }

        // Server decides: ALLOW if role==='admin' OR beta_user===true
        const { data, error } = await supabase.rpc("has_app_access", { uid: user.id });
        const ok = !!data && !error;

        if (import.meta.env.DEV) console.log("[Gate:RPC]", { uid: user.id, ok, error: error?.message });
        if (alive) { setAllowed(ok); setLoading(false); }
      } catch (e: any) {
        console.error("[Gate:RPC] Unexpected error:", e);
        if (alive) { setAllowed(false); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!hasUser) return <Navigate to="/login" replace />;

  if (!allowed) {
    (async () => { 
      try { 
        const supabase = getSupabase();
        await supabase.auth.signOut(); 
      } catch (error) {
        console.error("[Gate:RPC] SignOut error:", error);
      }
    })();
    return <Navigate to="/beta-pending" replace />;
  }
  
  return children;
}