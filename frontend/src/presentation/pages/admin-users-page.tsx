import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '@domain/entities/user-profile';
import {
  fetchAdminUsers,
  updateUserRole,
  type AdminUser
} from '@infrastructure/api/admin-api';

const ROLES: UserRole[] = ['klient', 'monter', 'admin'];

export const AdminUsersPage = () => {
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
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSavingId(userId);
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Grant monter or admin roles. New sign-ups default to klient.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const fullName =
                  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || '—';
                return (
                  <tr key={u.id} className="text-slate-200">
                    <td className="px-4 py-3 font-medium">{fullName}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{u.phoneNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-gray-100 focus:border-amber-300 focus:outline-none disabled:opacity-60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
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
