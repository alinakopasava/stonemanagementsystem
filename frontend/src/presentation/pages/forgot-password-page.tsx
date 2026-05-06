import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { AuthShell } from '@presentation/components/auth-shell';

export const ForgotPasswordPage = () => {
  const { sendPasswordReset } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      footer={
        <Link to="/sign-in" className="text-amber-300 hover:underline">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {t('forgotPassword.success', { email })}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">{t('auth.email')}</span>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-gray-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  );
};
