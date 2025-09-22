import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSupabase } from "../../lib/supabase";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (alive) { 
          setAllowed(false); 
          setLoading(false); 
        }
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role, beta_user")
        .eq("user_id", user.id)
        .single();

      const ok = !error && (prof?.role === "admin" || prof?.beta_user === true);

      // DEV: diagnostics — remove in production commits
      if (!import.meta.env.PROD) {
        console.warn("[ProtectedRoute] supabase.url", supabase.supabaseUrl);
        console.warn("[ProtectedRoute] user", user?.id, user?.email);
        console.warn("[ProtectedRoute] prof", prof, "error:", error);
        console.warn("[ProtectedRoute] allowed", ok);
        if (!ok) console.warn("[ProtectedRoute] redirect -> /beta-pending");
      }

      if (alive) {
        setAllowed(ok);
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  if (loading) return null; // keep blank during auth check

  if (allowed) return children;

  // Not allowed → sign out and bounce to beta-pending
  (async () => { 
    try { 
      const supabase = getSupabase();
      await supabase.auth.signOut(); 
    } catch {} 
  })();
  
  if (location.pathname !== "/beta-pending") {
    return <Navigate to="/beta-pending" replace />;
  }
  return null;
}