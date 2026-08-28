import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Mail, Package, Users } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { Header } from '@presentation/components/header';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors',
    isActive
      ? 'border-brand bg-brand-soft text-brand'
      : 'border-transparent text-ink-2 hover:border-line-strong hover:text-ink'
  ].join(' ');

export const AdminLayout = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Header />
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line bg-surface py-3">
            <div className="u-group-label flex items-center gap-2 px-4 pb-3">
              <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('header.admin')}
            </div>
            <nav className="flex flex-col">
              <NavLink to="/admin/users" className={navItemClass}>
                <Users className="h-4 w-4" />
                {t('admin.users.title')}
              </NavLink>
              <NavLink to="/admin/order-cards" className={navItemClass}>
                <ClipboardList className="h-4 w-4" />
                {t('admin.orderCards.title')}
              </NavLink>
              <NavLink to="/admin/orders" className={navItemClass}>
                <Package className="h-4 w-4" />
                {t('admin.orders.title')}
              </NavLink>
              <NavLink to="/admin/messages" className={navItemClass}>
                <Mail className="h-4 w-4" />
                {t('admin.messages.title')}
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
