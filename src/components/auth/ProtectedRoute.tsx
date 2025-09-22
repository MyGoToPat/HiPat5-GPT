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

        // Special case for admin email fallback
        if (user.email === 'info@hipat.app') {
          if (import.meta.env.DEV) console.log("[Gate:ProtectedRoute]", { uid: user.id, email: user.email, role: 'admin_fallback', beta: false, allowed: true });
          if (alive) { setAllowed(true); setLoading(false); }
          return;
        }

        // Try to fetch profile with proper error handling
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("role, beta_user")
          .eq("user_id", user.id)  // IMPORTANT: user_id, not id
          .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully

        if (error) {
          console.error("[Gate:ProtectedRoute] Profile query error:", error);
          if (alive) { setAllowed(false); setLoading(false); }
          return;
        }

        // Handle missing profile case
        if (!prof) {
          if (import.meta.env.DEV) console.log("[Gate:ProtectedRoute]", { uid: user.id, profile: 'missing', allowed: false });
          if (alive) { setAllowed(false); setLoading(false); }
          return;
        }

        // Check authorization - handle null beta_user values
        const isAdmin = prof.role === "admin";
        const isBeta = prof.beta_user === true;
        const ok = isAdmin || isBeta;
        
        if (import.meta.env.DEV) {
          console.log("[Gate:ProtectedRoute]", { 
            uid: user.id, 
            role: prof?.role, 
            beta: prof?.beta_user, 
            isAdmin, 
            isBeta, 
            allowed: ok 
          });
        }
        
        if (alive) { 
          setAllowed(ok); 
          setLoading(false); 
        }
      } catch (error) {
        console.error("[Gate:ProtectedRoute] Unexpected error:", error);
        if (alive) { 
          setAllowed(false); 
          setLoading(false); 
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null; // keep blank while checking
  if (!hasUser) return <Navigate to="/login" replace />;

  if (!allowed) {
    (async () => { 
      try { 
        const supabase = getSupabase();
        await supabase.auth.signOut(); 
      } catch (error) {
        console.error("[Gate:ProtectedRoute] SignOut error:", error);
      }
    })();
    return <Navigate to="/beta-pending" replace />;
  }
  
  return children;
}