import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import type { UserRole } from '@domain/entities/user-profile';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-200">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
