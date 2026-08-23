import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useI18n } from '../hooks/useI18n';
import { getDefaultDashboardPath } from '../config/permissions';
import type { UserRole } from '../types/domain';

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-bolman-dark text-bolman-purple">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading, profileLoading, profileError, refreshProfile, signOut } = useAuth();
  const { messages } = useI18n();

  if (loading) return <FullScreenSpinner label={messages.common.loading} />;

  if (!session) return <Navigate to="/login" replace />;

  // Signed in but with no profile row: every nav item and section is role-driven, so the
  // dashboard would render as an empty shell. Say what happened instead of showing nothing.
  if (!profile) {
    if (profileLoading) return <FullScreenSpinner label={messages.common.loading} />;

    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-bolman-dark">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-200 bg-white p-6 text-center dark:border-red-500/30 dark:bg-bolman-cardDark">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {messages.common.profileLoadFailed}
          </p>
          {profileError ? (
            <p className="break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200">
              {profileError}
            </p>
          ) : null}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => refreshProfile()}
              className="rounded-lg bg-bolman-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              {messages.common.retry}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {messages.layout.logout}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roles?.length && !roles.includes(profile.role)) {
    return <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  return <>{children}</>;
}
