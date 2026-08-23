import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import {
  fetchAdminOrders,
  updateOrderStatus,
  type AdminOrder
} from '@infrastructure/api/admin-api';

/** Status zostaje w bazie jako enum w PL — tłumaczymy tylko etykietę pod nim. */
const ORDER_STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  oczekujące: 'admin.orders.status.pending',
  w_realizacji: 'admin.orders.status.inProgress',
  zrealizowane: 'admin.orders.status.completed',
  anulowane: 'admin.orders.status.cancelled'
};

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL_KEYS);

const statusBadge: Record<string, string> = {
  oczekujące: 'bg-amber-300/10 text-amber-200 border-amber-300/30',
  w_realizacji: 'bg-sky-300/10 text-sky-200 border-sky-300/30',
  zrealizowane: 'bg-emerald-300/10 text-emerald-200 border-emerald-300/30',
  anulowane: 'bg-rose-400/10 text-rose-200 border-rose-400/30'
};

export const AdminOrdersPage = () => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const statusLabel = useMemo(
    () => (status: string) => {
      const key = ORDER_STATUS_LABEL_KEYS[status];
      return key ? t(key) : status;
    },
    [t]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAdminOrders();
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.orders.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
      alert(err instanceof Error ? err.message : t('admin.orders.updateError'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">{t('admin.orders.title')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('admin.orders.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
        >
          {t('admin.common.refresh')}
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
            {t('admin.common.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            {t('admin.orders.empty')}
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
                      {t('admin.orders.created')}{' '}
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString(dateLocale)
                        : t('admin.common.unknown')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t('admin.orders.clientId')}{' '}
                      <span className="font-mono">{o.user_id?.slice(0, 8) ?? '—'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                        statusBadge[status] ?? 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                    >
                      {statusLabel(status)}
                    </span>
                    <select
                      value={status}
                      disabled={savingId === o.id}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-gray-100 focus:border-amber-300 focus:outline-none disabled:opacity-60"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </header>

                {details.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">{t('admin.orders.noDetails')}</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {details.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300"
                      >
                        <p className="font-medium text-slate-100">
                          {materialLabel(d.materials?.name, t, t('admin.orders.unknownMaterial'))}
                        </p>
                        <dl className="mt-1 grid grid-cols-[90px_1fr] gap-y-0.5">
                          <dt className="text-slate-500">{t('admin.orders.dimensions')}</dt>
                          <dd>{d.dimensions ?? '—'}</dd>
                          <dt className="text-slate-500">{t('admin.orders.finish')}</dt>
                          <dd>{finishLabel(d.finish_type, t)}</dd>
                          <dt className="text-slate-500">{t('admin.orders.inscription')}</dt>
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
