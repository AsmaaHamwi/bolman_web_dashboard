import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useI18n } from '../hooks/useI18n';
import { getDefaultDashboardPath } from '../config/permissions';
import type { UserRole } from '../types/domain';

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();
  const { messages } = useI18n();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-bolman-dark text-bolman-purple">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm font-medium">{messages.common.loading}</span>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (roles?.length && profile && !roles.includes(profile.role)) {
    return <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  return <>{children}</>;
}

