import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { isRateLimited } from '@infrastructure/api/api-client';
import { AuthShell } from '@presentation/components/auth-shell';

export const ForgotPasswordPage = () => {
  const { sendPasswordReset } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedEmail = email.trim();
  const canSubmit =
    /.+@.+\..+/.test(normalizedEmail) && normalizedEmail.length <= 254 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await sendPasswordReset(normalizedEmail);
      setSent(true);
    } catch (err) {
      if (isRateLimited(err)) {
        setError(t('auth.tooManyAttempts'));
      } else {
        setSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      footer={
        <Link to="/sign-in" className="text-brand hover:underline">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {sent ? (
        <p className="border border-positive bg-positive-soft px-3 py-2 text-sm text-positive">
          {t('forgotPassword.success', { email: normalizedEmail })}
        </p>
      ) : (
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
            {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  );
};
