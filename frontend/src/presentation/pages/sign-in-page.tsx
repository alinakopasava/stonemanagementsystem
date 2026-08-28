import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { safeInternalPath } from '@application/auth/safe-path';
import { useTranslation } from '@application/i18n/i18n-context';
import { isRateLimited } from '@infrastructure/api/api-client';
import { AuthShell } from '@presentation/components/auth-shell';

interface LocationState {
  from?: string;
}

export const SignInPage = () => {
  const { isLoading, user, signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeInternalPath((location.state as LocationState | null)?.from);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, user, navigate, redirectTo]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit =
    /.+@.+\..+/.test(email.trim()) &&
    email.length <= 254 &&
    password.length > 0 &&
    password.length <= 128 &&
    !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(isRateLimited(err) ? t('auth.tooManyAttempts') : t('signIn.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
      footer={
        <>
          {t('signIn.newHere')}{' '}
          <Link to="/sign-up" className="text-brand hover:underline">
            {t('signIn.createAccount')}
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block space-y-2">
          <span className="u-label">{t('auth.email')}</span>
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="u-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="flex items-center justify-between text-sm text-ink-2">
            {t('auth.password')}
            <Link to="/forgot-password" className="text-xs text-ink-3 hover:text-brand">
              {t('signIn.forgot')}
            </Link>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            className="u-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error ? (
          <p className="border border-critical bg-critical-soft px-3 py-2 text-sm text-critical">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="u-btn u-btn-primary w-full py-2.5"
        >
          {isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
        </button>
      </form>
    </AuthShell>
  );
};
