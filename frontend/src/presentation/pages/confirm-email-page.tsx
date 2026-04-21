import { Link, useLocation } from 'react-router-dom';
import { AuthShell } from '@presentation/components/auth-shell';

interface LocationState {
  email?: string;
}

export const ConfirmEmailPage = () => {
  const location = useLocation();
  const email = (location.state as LocationState | null)?.email;

  return (
    <AuthShell
      title="Confirm your email"
      subtitle={
        email
          ? `We just sent a confirmation link to ${email}. Click it to activate your account.`
          : 'We just sent a confirmation link to your inbox. Click it to activate your account.'
      }
      footer={
        <Link to="/sign-in" className="text-amber-300 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <p className="text-sm text-slate-300">
        Didn&apos;t get the email? Check your spam folder, or wait a minute and try again.
      </p>
    </AuthShell>
  );
};
