import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Users } from 'lucide-react';
import { Header } from '@presentation/components/header';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
    isActive
      ? 'bg-amber-300/10 text-amber-100'
      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
  ].join(' ');

export const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
            <div className="flex items-center gap-2 px-2 pb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Admin
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin/users" className={navItemClass}>
                <Users className="h-4 w-4" />
                Users
              </NavLink>
              <NavLink to="/admin/orders" className={navItemClass}>
                <Package className="h-4 w-4" />
                Orders
              </NavLink>
            </nav>
          </div>
        </aside>

        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
};
