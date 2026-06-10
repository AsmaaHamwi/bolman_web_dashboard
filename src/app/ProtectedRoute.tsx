import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { useI18n } from '../hooks/useI18n';
import { getDefaultDashboardPath } from '../config/permissions';
import type { UserRole } from '../types/domain';

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();
  const { messages } = useI18n();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!session) return <Navigate to="/login" replace />;

  if (roles?.length && profile && !roles.includes(profile.role)) {
    return <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  return <>{children}</>;
}
