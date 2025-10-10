import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';

/**
 * TDEEGuard - Ensures users complete TDEE calculator before accessing the app
 *
 * Redirects users to /tdee if they haven't completed the TDEE calculator,
 * except when they're already on the TDEE page or certain public pages.
 */
export default function TDEEGuard({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [hasCompletedTDEE, setHasCompletedTDEE] = useState(false);
  const location = useLocation();

  // Pages that don't require TDEE completion
  const exemptPaths = [
    '/tdee',
    '/profile', // Allow profile access so users can see the "Not completed" message
    '/health',
    '/beta-pending'
  ];

  const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user has completed TDEE by checking user_metrics.tdee
        // This is the same field the UI uses to determine completion status
        const { data: metrics } = await supabase
          .from('user_metrics')
          .select('tdee')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!mounted) return;

        // User has completed TDEE if tdee exists and is > 0
        const completed = metrics?.tdee != null && metrics.tdee > 0;
        setHasCompletedTDEE(completed);
        setLoading(false);
      } catch (error) {
        console.error('TDEEGuard error:', error);
        if (mounted) {
          // On error, allow access (fail open rather than blocking user)
          setHasCompletedTDEE(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Allow access if on exempt path or TDEE completed
  if (isExemptPath || hasCompletedTDEE) {
    return children;
  }

  // Redirect to TDEE calculator if not completed
  return <Navigate to="/tdee" replace />;
}
