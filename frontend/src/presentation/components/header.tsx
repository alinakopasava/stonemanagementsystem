import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { LanguageSwitcher } from '@presentation/components/language-switcher';
import { Wordmark } from '@presentation/components/wordmark';

interface NavTarget {
  to: string;
  label: string;
  /**
   * Staff destinations. They used to be told apart by colour, which broke the
   * one-accent rule and made "admin" read as a warning. They are grouped
   * behind a rule now instead, which scans faster and costs no palette.
   */
  staff?: boolean;
}

export const Header = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user?.profile.role === 'admin';
  const canAccessInstaller =
    user?.profile.role === 'admin' || user?.profile.role === 'monter';
  /** Ordering is a customer activity; staff work the other side of the desk. */
  const isCustomer = user?.profile.role === 'klient';

  /**
   * One list of destinations for both layouts. The phone menu is not a reduced
   * copy of the desktop bar: it offers the same places, so a section added
   * here cannot go missing on one of them.
   */
  const navTargets: NavTarget[] = [
    { to: '/catalog', label: t('header.catalog') },
    { to: '/design', label: t('header.designer') },
    ...(isCustomer ? [{ to: '/my-orders', label: t('header.myOrders') }] : []),
    ...(canAccessInstaller
      ? [{ to: '/installer', label: t('header.installer'), staff: true }]
      : []),
    ...(isAdmin ? [{ to: '/admin', label: t('header.admin'), staff: true }] : [])
  ];

  const firstStaffIndex = navTargets.findIndex((target) => target.staff);

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

  // A panel left open over the page the user just navigated to hides it.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
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

  /**
   * "Where am I" has to be answerable without relying on colour, so the
   * current section carries a rule under its label.
   */
  const isCurrent = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 text-sm lg:flex">
          {navTargets.map(({ to, label, staff }, index) => (
            <span key={to} className="flex items-center">
              {staff && index === firstStaffIndex ? (
                <span className="mx-3 h-4 w-px bg-line-strong" aria-hidden="true" />
              ) : null}
              <Link
                to={to}
                aria-current={isCurrent(to) ? 'page' : undefined}
                className={[
                  'relative px-2 py-2 transition-colors',
                  isCurrent(to)
                    ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-brand'
                    : 'text-ink-2 hover:text-ink'
                ].join(' ')}
              >
                {label}
              </Link>
            </span>
          ))}

          <span className="ml-3">
            <LanguageSwitcher />
          </span>

          {!user ? (
            <span className="ml-3 flex items-center gap-2">
              <Link to="/sign-in" className="u-btn u-btn-secondary px-4 py-2">
                {t('header.signIn')}
              </Link>
              <Link to="/sign-up" className="u-btn u-btn-primary px-4 py-2">
                {t('header.signUp')}
              </Link>
            </span>
          ) : isAdmin ? (
            <div className="relative ml-3" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="u-btn u-btn-secondary px-3 py-2 font-normal"
              >
                <span className="max-w-[150px] truncate">{adminDisplayName}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-ink-3 transition-transform ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-64 border border-line bg-surface shadow-overlay">
                  <div className="border-b border-line px-4 py-3">
                    <p className="text-xs text-ink-3">{t('header.signedInAs')}</p>
                    <p className="truncate text-sm text-ink">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    {t('header.signOut')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="u-btn u-btn-secondary ml-3 px-4 py-2"
            >
              {t('header.signOut')}
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? t('header.closeMenu') : t('header.openMenu')}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-brand lg:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-surface px-4 pb-5 pt-2 text-sm lg:hidden"
        >
          <div className="flex flex-col">
            {navTargets.map(({ to, label, staff }, index) => (
              <span key={to} className="contents">
                {staff && index === firstStaffIndex ? (
                  <span className="my-2 h-px bg-line" aria-hidden="true" />
                ) : null}
                <Link
                  to={to}
                  aria-current={isCurrent(to) ? 'page' : undefined}
                  className={[
                    'border-l-2 px-3 py-3 transition-colors',
                    isCurrent(to)
                      ? 'border-brand text-ink'
                      : 'border-transparent text-ink-2 hover:border-line-strong hover:text-ink'
                  ].join(' ')}
                >
                  {label}
                </Link>
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <LanguageSwitcher />
            {user ? (
              <span className="min-w-0 truncate text-xs text-ink-3">{user.email}</span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {!user ? (
              <>
                <Link to="/sign-in" className="u-btn u-btn-secondary w-full py-3">
                  {t('header.signIn')}
                </Link>
                <Link to="/sign-up" className="u-btn u-btn-primary w-full py-3">
                  {t('header.signUp')}
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="u-btn u-btn-secondary w-full py-3"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                {t('header.signOut')}
              </button>
            )}
          </div>
        </nav>
      ) : null}

      {signOutError ? (
        <p
          role="alert"
          className="border-t border-critical bg-critical-soft px-6 py-2 text-center text-sm text-critical"
        >
          {signOutError}
        </p>
      ) : null}
    </header>
  );
};
