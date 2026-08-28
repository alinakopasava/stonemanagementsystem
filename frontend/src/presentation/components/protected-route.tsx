import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import type { UserRole } from '@domain/entities/user-profile';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isLoading, user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface text-ink-2">
        {t('app.loading')}
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
