import { useEffect, useRef, useState } from 'react';
import { Landmark, LogIn, LogOut, Shield, UserPlus, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';

const roleLabel: Record<string, string> = {
  klient: 'Client',
  monter: 'Installer',
  admin: 'Admin'
};

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const displayName =
    [user?.profile.firstName, user?.profile.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Account';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-amber-300" />
          <span className="font-serif text-xl text-gray-100">Signature Stone</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
          <Link to="/catalog" className="transition hover:text-white">
            Catalog
          </Link>
          <Link to="/design" className="transition hover:text-white">
            3D Designer
          </Link>
          {user?.profile.role === 'admin' ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-amber-300 transition hover:text-amber-200"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}

          {!user ? (
            <>
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 transition hover:border-slate-400 hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 font-medium text-slate-900 transition hover:bg-white"
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 transition hover:border-slate-400 hover:text-white"
              >
                <UserRound className="h-4 w-4" />
                <span className="max-w-[160px] truncate">{displayName}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                  {roleLabel[user.profile.role] ?? user.profile.role}
                </span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl">
                  <div className="px-3 py-2 text-xs text-slate-400">
                    Signed in as
                    <div className="truncate text-slate-200">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
