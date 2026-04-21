import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminOrders,
  updateOrderStatus,
  type AdminOrder
} from '@infrastructure/api/admin-api';

const ORDER_STATUSES = ['oczekujące', 'w_realizacji', 'zrealizowane', 'anulowane'];

const statusBadge: Record<string, string> = {
  oczekujące: 'bg-amber-300/10 text-amber-200 border-amber-300/30',
  w_realizacji: 'bg-sky-300/10 text-sky-200 border-sky-300/30',
  zrealizowane: 'bg-emerald-300/10 text-emerald-200 border-emerald-300/30',
  anulowane: 'bg-rose-400/10 text-rose-200 border-rose-400/30'
};

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAdminOrders();
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (orderId: string, status: string) => {
    setSavingId(orderId);
    try {
      const { data } = await updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: data.status, updated_at: data.updated_at } : o
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">Orders</h1>
          <p className="mt-1 text-sm text-slate-400">
            All client orders across the shop. Change status as the work progresses.
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

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            Loading...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            No orders yet.
          </div>
        ) : (
          orders.map((o) => {
            const details = o.order_cards?.order_details ?? [];
            const status = o.status ?? 'oczekujące';
            return (
              <article
                key={o.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-slate-500">#{o.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Created:{' '}
                      {o.created_at ? new Date(o.created_at).toLocaleString() : 'unknown'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Client id:{' '}
                      <span className="font-mono">{o.user_id?.slice(0, 8) ?? '—'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                        statusBadge[status] ?? 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                    >
                      {status}
                    </span>
                    <select
                      value={status}
                      disabled={savingId === o.id}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-gray-100 focus:border-amber-300 focus:outline-none disabled:opacity-60"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </header>

                {details.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">No details on this order.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {details.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300"
                      >
                        <p className="font-medium text-slate-100">
                          {d.materials?.name ?? 'Unknown material'}
                        </p>
                        <dl className="mt-1 grid grid-cols-[90px_1fr] gap-y-0.5">
                          <dt className="text-slate-500">Dimensions</dt>
                          <dd>{d.dimensions ?? '—'}</dd>
                          <dt className="text-slate-500">Finish</dt>
                          <dd>{d.finish_type ?? '—'}</dd>
                          <dt className="text-slate-500">Inscription</dt>
                          <dd className="italic text-slate-200">
                            {d.inscription_text ?? '—'}
                          </dd>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
