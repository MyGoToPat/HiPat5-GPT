import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}