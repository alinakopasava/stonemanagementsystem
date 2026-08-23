import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import {
  PASSWORD_MAX_LENGTH,
  passwordMeetsPolicy,
  passwordRequirements
} from '@application/auth/password-policy';
import { useTranslation } from '@application/i18n/i18n-context';
import { isRateLimited } from '@infrastructure/api/api-client';
import { AuthShell } from '@presentation/components/auth-shell';

export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const { isLoading, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checks = passwordRequirements.map((requirement) => ({
    ...requirement,
    passed: requirement.test(password)
  }));
  const canSubmit =
    passwordMeetsPolicy(password) &&
    password === confirm &&
    !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(isRateLimited(err) ? t('auth.tooManyAttempts') : t('resetPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthShell title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')}>
        <p className="text-sm text-slate-300">{t('app.loading')}</p>
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell title={t('resetPassword.title')} subtitle={t('resetPassword.invalidLink')}>
        <Link to="/forgot-password" className="text-sm text-amber-300 hover:underline">
          {t('resetPassword.requestNewLink')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')}>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('resetPassword.newPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={PASSWORD_MAX_LENGTH}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <ul className="space-y-1 text-xs">
          {checks.map((check) => (
            <li
              key={check.id}
              className={check.passed ? 'text-emerald-300' : 'text-slate-400'}
            >
              {check.passed ? '\u2713' : '\u2022'} {t(check.labelKey)}
            </li>
          ))}
        </ul>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('resetPassword.confirmPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={PASSWORD_MAX_LENGTH}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm && password !== confirm ? (
            <span className="text-xs text-red-300">{t('auth.passwordsMismatch')}</span>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md bg-gray-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        >
          {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </button>
      </form>
    </AuthShell>
  );
};
