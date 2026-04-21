import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { AuthShell } from '@presentation/components/auth-shell';

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', label: 'One digit', test: (v: string) => /\d/.test(v) }
];

export const SignUpPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

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
  const passwordIsValid = checks.every((c) => c.passed);
  const passwordsMatch = password === passwordConfirm;

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
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
        email,
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
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Join Signature Stone to place and track memorial orders."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="text-amber-300 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">First name</span>
            <input
              type="text"
              autoComplete="given-name"
              required
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">Last name</span>
            <input
              type="text"
              autoComplete="family-name"
              required
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">Phone (optional)</span>
          <input
            type="tel"
            autoComplete="tel"
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </label>

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

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <ul className="space-y-1 text-xs">
          {checks.map((c) => (
            <li key={c.id} className={c.passed ? 'text-emerald-300' : 'text-slate-400'}>
              {c.passed ? '\u2713' : '\u2022'} {c.label}
            </li>
          ))}
        </ul>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          {passwordConfirm && !passwordsMatch ? (
            <span className="text-xs text-red-300">Passwords do not match.</span>
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
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
};
