import { useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck,
  Landmark,
  LogIn,
  LogOut,
  Shield,
  UserPlus,
  UserRound
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { LanguageSwitcher } from '@presentation/components/language-switcher';

export const Header = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user?.profile.role === 'admin';
  const canAccessInstaller =
    user?.profile.role === 'admin' || user?.profile.role === 'monter';

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setSignOutError(t('header.signOutError'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const adminDisplayName =
    [user?.profile.firstName, user?.profile.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    t('header.account');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-amber-300" />
          <span className="font-serif text-xl text-gray-100">Signature Stone</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
          <Link to="/catalog" className="transition hover:text-white">
            {t('header.catalog')}
          </Link>
          <Link to="/design" className="transition hover:text-white">
            {t('header.designer')}
          </Link>

          <LanguageSwitcher />

          {!user ? (
            <>
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 transition hover:border-slate-400 hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                {t('header.signIn')}
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 font-medium text-slate-900 transition hover:bg-white"
              >
                <UserPlus className="h-4 w-4" />
                {t('header.signUp')}
              </Link>
            </>
          ) : isAdmin ? (
            <>
              <Link
                to="/installer"
                className="inline-flex items-center gap-1.5 text-sky-300 transition hover:text-sky-200"
              >
                <ClipboardCheck className="h-4 w-4" />
                {t('header.installer')}
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-amber-300 transition hover:text-amber-200"
              >
                <Shield className="h-4 w-4" />
                {t('header.admin')}
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 transition hover:border-slate-400 hover:text-white"
                >
                  <UserRound className="h-4 w-4" />
                  <span className="max-w-[160px] truncate">{adminDisplayName}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                    {t('header.admin')}
                  </span>
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl">
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {t('header.signedInAs')}
                      <div className="truncate text-slate-200">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('header.signOut')}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              {canAccessInstaller ? (
                <Link
                  to="/installer"
                  className="inline-flex items-center gap-1.5 text-sky-300 transition hover:text-sky-200"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {t('header.installer')}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 transition hover:border-slate-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {t('header.signOut')}
              </button>
            </>
          )}
        </nav>
      </div>
      {signOutError ? (
        <p
          role="alert"
          className="border-t border-red-500/30 bg-red-500/10 px-6 py-2 text-center text-sm text-red-200"
        >
          {signOutError}
        </p>
      ) : null}
    </header>
  );
};
