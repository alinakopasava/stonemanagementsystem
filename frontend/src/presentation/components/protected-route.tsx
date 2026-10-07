import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import type { TranslationKey } from '@application/i18n/translations';
import type { UserRole } from '@domain/entities/user-profile';
import { Header } from '@presentation/components/header';

/** Where each role does its own work, so a refused user has somewhere to go. */
const HOME_PANEL: Record<UserRole, string> = {
  klient: '/my-orders',
  monter: '/installer',
  admin: '/admin'
};

/** Who the page is for, said in words rather than as a list of role ids. */
const deniedMessage = (allowedRoles: UserRole[]): TranslationKey => {
  if (allowedRoles.includes('klient')) return 'access.deniedClient';
  if (allowedRoles.includes('monter')) return 'access.deniedInstaller';
  return 'access.deniedAdmin';
};

/**
 * Shown in place of a page the signed-in user's role may not open.
 *
 * A silent bounce to the home page looked like a broken link: the user could
 * not tell a missing page from one they are not allowed into. The API refuses
 * the same requests with 403 regardless; this only says so out loud.
 */
const AccessDenied = ({ allowedRoles, role }: { allowedRoles: UserRole[]; role: UserRole }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
        <div role="alert" className="border border-critical bg-critical-soft p-6">
          <h1 className="flex items-center gap-2 text-lg font-medium text-critical">
            <ShieldAlert className="h-5 w-5" />
            {t('access.deniedTitle')}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{t(deniedMessage(allowedRoles))}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={HOME_PANEL[role]} className="u-btn u-btn-primary px-4 py-2 text-sm">
              {t('access.goToPanel')}
            </Link>
            <Link to="/" className="u-btn u-btn-secondary px-4 py-2 text-sm">
              {t('access.goHome')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

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
    return <AccessDenied allowedRoles={allowedRoles} role={user.profile.role} />;
  }

  return <>{children}</>;
};
