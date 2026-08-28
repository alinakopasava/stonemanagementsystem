import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import type { UserRole } from '@domain/entities/user-profile';
import { fetchAdminUsers, updateUserRole, type AdminUser } from '@infrastructure/api/admin-api';

const ROLES: Array<{ id: UserRole; labelKey: TranslationKey }> = [
  { id: 'klient', labelKey: 'admin.users.role.klient' },
  { id: 'monter', labelKey: 'admin.users.role.monter' },
  { id: 'admin', labelKey: 'admin.users.role.admin' }
];

export const AdminUsersPage = () => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.users.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSavingId(userId);
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.users.updateError'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('admin.users.title')}</h1>
          <p className="mt-1 text-sm text-ink-3">{t('admin.users.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
        >
          {t('admin.common.refresh')}
        </button>
      </div>

      {error ? (
        <p className="mb-4 border border-critical bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      ) : null}

      {/* Five columns do not fit a phone. Scrolling the table sideways keeps
          every column readable; clipping or squeezing them does not. */}
      <div className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-3">{t('admin.users.user')}</th>
              <th className="px-4 py-3">{t('admin.users.email')}</th>
              <th className="px-4 py-3">{t('admin.users.phone')}</th>
              <th className="px-4 py-3">{t('admin.users.created')}</th>
              <th className="px-4 py-3 text-right">{t('admin.users.role')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-3">
                  {t('admin.common.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-3">
                  {t('admin.users.empty')}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || '-';
                return (
                  <tr key={u.id} className="text-ink-2">
                    <td className="px-4 py-3 font-medium">{fullName}</td>
                    <td className="px-4 py-3 text-ink-2">{u.email ?? '-'}</td>
                    <td className="px-4 py-3 text-ink-3">{u.phoneNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-ink-3">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString(dateLocale) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="border border-line bg-canvas px-2 py-1.5 text-xs text-ink focus:border-brand disabled:opacity-60"
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {t(r.labelKey)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
