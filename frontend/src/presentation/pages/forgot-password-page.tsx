import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { AuthShell } from '@presentation/components/auth-shell';

export const ForgotPasswordPage = () => {
  const { sendPasswordReset } = useAuth();
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
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <Link to="/sign-in" className="text-amber-300 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">Email</span>
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
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};
