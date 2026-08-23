import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';

/**
 * Lands here after the user clicks the confirmation / magic link in email.
 * supabase-js reads and clears the callback tokens from the URL; AuthProvider moves the
 * tokens into httpOnly cookies and clears the in-memory Supabase session.
 */
export const AuthCallbackPage = () => {
  const { isLoading, authHandoffError, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const callbackParams = new URLSearchParams(
    location.hash.startsWith('#') ? location.hash.slice(1) : location.search
  );
  const hasProviderError =
    callbackParams.has('error') || callbackParams.has('error_code');
  const hasCallbackError = authHandoffError || hasProviderError;

  useEffect(() => {
    if (isLoading || hasCallbackError) return;
    navigate(user ? '/' : '/sign-in', { replace: true });
  }, [isLoading, hasCallbackError, user, navigate]);

  if (hasCallbackError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center text-slate-200">
        <p role="alert" className="text-red-200">
          {t('authCallback.error')}
        </p>
        <Link to="/sign-in" className="text-amber-300 hover:underline">
          {t('authCallback.backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-200">
      {t('authCallback.finalizing')}
    </div>
  );
};
