import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';

/**
 * Lands here after the user clicks the confirmation / magic link in email.
 * supabase-js (detectSessionInUrl: true) already consumed the tokens from
 * the URL; we just route the user to the right place when the session loads.
 */
export const AuthCallbackPage = () => {
  const { isLoading, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate(user ? '/' : '/sign-in', { replace: true });
  }, [isLoading, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-200">
      {t('authCallback.finalizing')}
    </div>
  );
};
