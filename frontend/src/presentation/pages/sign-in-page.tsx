import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { AuthShell } from '@presentation/components/auth-shell';

interface LocationState {
  from?: string;
}

export const SignInPage = () => {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signIn.error'));
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
          <Link to="/sign-up" className="text-amber-300 hover:underline">
            {t('signIn.createAccount')}
          </Link>
        </>
      }
    >
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

        <label className="block space-y-2">
          <span className="flex items-center justify-between text-sm text-slate-200">
            {t('auth.password')}
            <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-amber-300">
              {t('signIn.forgot')}
            </Link>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
        </button>
      </form>
    </AuthShell>
  );
};
