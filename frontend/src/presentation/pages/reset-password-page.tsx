import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@application/i18n/i18n-context';
import { supabase } from '@infrastructure/auth/supabase-client';
import { AuthShell } from '@presentation/components/auth-shell';

export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError(t('resetPassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">{t('resetPassword.confirmPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </button>
      </form>
    </AuthShell>
  );
};
