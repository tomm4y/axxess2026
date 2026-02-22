import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/AuthContext';

/** Requires authentication — redirects to /login if not logged in */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf6fa' }}>
        Loading…
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Only accessible when NOT logged in — redirects to /dashboard if already authenticated */
export function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf6fa' }}>
        Loading…
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
