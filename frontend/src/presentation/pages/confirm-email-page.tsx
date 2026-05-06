import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@application/i18n/i18n-context';
import { AuthShell } from '@presentation/components/auth-shell';

interface LocationState {
  email?: string;
}

export const ConfirmEmailPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const email = (location.state as LocationState | null)?.email;

  return (
    <AuthShell
      title={t('confirmEmail.title')}
      subtitle={
        email
          ? t('confirmEmail.subtitleWithEmail', { email })
          : t('confirmEmail.subtitleNoEmail')
      }
      footer={
        <Link to="/sign-in" className="text-amber-300 hover:underline">
          {t('confirmEmail.backToSignIn')}
        </Link>
      }
    >
      <p className="text-sm text-slate-300">{t('confirmEmail.tip')}</p>
    </AuthShell>
  );
};
