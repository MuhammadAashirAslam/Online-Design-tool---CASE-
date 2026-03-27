import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/*
 * Protects routes that require authentication or guest mode.
 * - If still loading the auth state → shows a spinner
 * - If not logged in AND not a guest → redirects to /login
 * - Otherwise → renders children
 */

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary, #0D0F14)',
        color: 'var(--text-secondary, #8A8FA4)',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        fontSize: 14,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--brand-500, #6C63FF)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          Loading...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in and not using guest mode
  if (!user && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
