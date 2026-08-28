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
  const hasProviderError = callbackParams.has('error') || callbackParams.has('error_code');
  const hasCallbackError = authHandoffError || hasProviderError;

  useEffect(() => {
    if (isLoading || hasCallbackError) return;
    navigate(user ? '/' : '/sign-in', { replace: true });
  }, [isLoading, hasCallbackError, user, navigate]);

  if (hasCallbackError) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center text-ink-2">
        <p role="alert" className="text-critical">
          {t('authCallback.error')}
        </p>
        <Link to="/sign-in" className="text-brand hover:underline">
          {t('authCallback.backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface text-ink-2">
      {t('authCallback.finalizing')}
    </div>
  );
};
