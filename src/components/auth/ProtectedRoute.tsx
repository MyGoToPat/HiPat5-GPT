import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSupabase } from "../../lib/supabase";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (alive) {
          setAllowed('no-user' as any);
          setLoading(false);
        }
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role, beta_user")
        .eq("user_id", user.id)
        .single();

      const allowed = prof?.role === "admin" || prof?.beta_user === true;
      
      // Dev logging for debugging
      if (import.meta.env.DEV) {
        console.log("[Gate]", { 
          uid: user?.id, 
          role: prof?.role, 
          beta: prof?.beta_user, 
          allowed 
        });
      }
      
      if (!allowed) {
        await supabase.auth.signOut();
        if (alive) {
          setAllowed(false);
          setLoading(false);
        }
        return;
      }

      if (alive) {
        setAllowed(true);
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  if (loading) return null; // keep blank during auth check

  // No user authenticated - redirect to login
  if (allowed === 'no-user') {
    return <Navigate to="/login" replace />;
  }

  // User authenticated but not authorized - redirect to beta pending
  if (!allowed) {
    return <Navigate to="/beta-pending" replace />;
  }
  
  return children;
}