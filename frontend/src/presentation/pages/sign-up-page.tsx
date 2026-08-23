import { useEffect, useMemo, useState } from 'react';
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

export const SignUpPage = () => {
  const { isLoading, user, signUp } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, navigate]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = useMemo(
    () => passwordRequirements.map((req) => ({ ...req, passed: req.test(password) })),
    [password]
  );
  const passwordIsValid = passwordMeetsPolicy(password);
  const passwordsMatch = password === passwordConfirm;

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.length <= 254 &&
    /.+@.+\..+/.test(email.trim()) &&
    passwordIsValid &&
    passwordsMatch &&
    !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { requiresEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim() || undefined
      });
      if (requiresEmailConfirmation) {
        navigate('/confirm-email', { replace: true, state: { email } });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(isRateLimited(err) ? t('auth.tooManyAttempts') : t('signUp.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('signUp.title')}
      subtitle={t('signUp.subtitle')}
      footer={
        <>
          {t('signUp.haveAccount')}{' '}
          <Link to="/sign-in" className="text-amber-300 hover:underline">
            {t('signIn.submit')}
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">{t('auth.firstName')}</span>
            <input
              type="text"
              autoComplete="given-name"
              required
              minLength={2}
              maxLength={80}
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">{t('auth.lastName')}</span>
            <input
              type="text"
              autoComplete="family-name"
              required
              minLength={2}
              maxLength={80}
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('auth.phoneOptional')}</span>
          <input
            type="tel"
            autoComplete="tel"
            maxLength={32}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('auth.email')}</span>
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('auth.password')}</span>
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
          {checks.map((c) => (
            <li key={c.id} className={c.passed ? 'text-emerald-300' : 'text-slate-400'}>
              {c.passed ? '\u2713' : '\u2022'} {t(c.labelKey)}
            </li>
          ))}
        </ul>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('auth.confirmPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={PASSWORD_MAX_LENGTH}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          {passwordConfirm && !passwordsMatch ? (
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
          {isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
        </button>
      </form>
    </AuthShell>
  );
};
