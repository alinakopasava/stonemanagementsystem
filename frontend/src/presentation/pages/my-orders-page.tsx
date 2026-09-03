import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { ORDER_STATUS_BADGE } from '@domain/entities/order-status';
import { useCurrency } from '@application/currency/currency-context';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import { Header } from '@presentation/components/header';
import { DataFields, DataSection } from '@presentation/components/data-fields';
import { fetchMyOrders, type MyOrder } from '@infrastructure/api/order-api';

/**
 * Statuses live in the database as a Polish enum; only the label is translated.
 * `awaiting` is not one of them — it stands for a submission the office has not
 * turned into an order yet, which the customer still needs to see as a state.
 */
const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  oczekujące: 'myOrders.status.pending',
  w_realizacji: 'myOrders.status.inProgress',
  zrealizowane: 'myOrders.status.completed',
  anulowane: 'myOrders.status.cancelled'
};

/** The four order states share one palette with the office panel; `awaiting`
    is this page's own, for a card the office has not converted yet. */
const STATUS_BADGE: Record<string, string> = {
  ...ORDER_STATUS_BADGE,
  awaiting: 'bg-surface-2 text-ink-2 border-line-strong'
};

export const MyOrdersPage = () => {
  const { t, language } = useTranslation();
  const { formatFromByn } = useCurrency();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = useCallback(
    (value: string | null, withTime = false) =>
      value
        ? withTime
          ? new Date(value).toLocaleString(dateLocale)
          : new Date(value).toLocaleDateString(dateLocale)
        : null,
    [dateLocale]
  );

  const formatPrice = useCallback(
    (value: number | string | null) =>
      value === null || value === undefined || value === ''
        ? null
        : `${formatFromByn(Number(value), { digits: 2 })} ${t('designer.priceUnit')}`,
    [formatFromByn, t]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrders(await fetchMyOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('myOrders.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('myOrders.title')}</h1>
            <p className="mt-1 text-sm text-ink-3">{t('myOrders.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="border border-line px-3 py-1.5 text-xs text-ink-2 transition hover:border-line-strong hover:text-ink"
          >
            {t('myOrders.refresh')}
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mb-4 border border-critical bg-critical-soft px-3 py-2 text-sm text-critical"
          >
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {t('myOrders.loading')}
          </div>
        ) : error ? /* A failed load is not an empty account. The alert above already
             says what happened; an empty state here would claim otherwise. */
        null : orders.length === 0 ? (
          <div className="border border-line bg-surface p-10 text-center">
            <PackageOpen className="mx-auto h-8 w-8 text-ink-3" />
            <p className="mt-4 text-lg text-ink-2">{t('myOrders.empty')}</p>
            <p className="mt-1 text-sm text-ink-3">{t('myOrders.emptyHint')}</p>
            <Link
              to="/design"
              className="u-btn u-btn-primary mt-5 px-4 py-2"
            >
              {t('myOrders.emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((entry) => {
              const order = entry.order;
              const status = order ? (order.status ?? 'oczekujące') : 'awaiting';
              const statusKey = order ? STATUS_LABEL_KEYS[status] : 'myOrders.status.awaiting';

              return (
                <article key={entry.id} className="border border-line bg-surface p-5">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-ink-3">
                        {t('myOrders.reference')} #{entry.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-ink-3">
                        {t('myOrders.submitted')}{' '}
                        {formatDate(entry.submitted_at, true) ?? t('myOrders.notProvided')}
                      </p>
                    </div>
                    <span
                      className={`border px-3 py-1 text-[10px] uppercase tracking-wider ${
                        STATUS_BADGE[status] ?? 'border-line bg-surface-2 text-ink-2'
                      }`}
                    >
                      {statusKey ? t(statusKey) : status}
                    </span>
                  </header>

                  {order ? (
                    <div className="mt-4">
                      <DataSection title={t('myOrders.orderSection')}>
                        <DataFields
                          placeholder={t('myOrders.notProvided')}
                          fields={[
                            { label: t('myOrders.price'), value: formatPrice(order.price) },
                            { label: t('myOrders.deadline'), value: formatDate(order.deadline) },
                            {
                              label: t('myOrders.confirmedAt'),
                              value: formatDate(order.created_at)
                            },
                            {
                              label: t('myOrders.address'),
                              value: order.installation_address,
                              wide: true
                            }
                          ]}
                        />
                      </DataSection>
                    </div>
                  ) : (
                    <p className="mt-4 border border-line bg-canvas p-3 text-xs text-ink-3">
                      {t('myOrders.awaitingReview')}
                    </p>
                  )}

                  {entry.order_details.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-3">{t('myOrders.noDetails')}</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {entry.order_details.map((detail) => (
                        <DataSection key={detail.id} title={t('myOrders.configSection')}>
                          <p className="mb-2 font-medium text-ink">
                            {materialLabel(
                              detail.materials?.name,
                              t,
                              t('myOrders.unknownMaterial')
                            )}
                          </p>
                          <DataFields
                            placeholder={t('myOrders.notProvided')}
                            fields={[
                              { label: t('myOrders.category'), value: detail.materials?.category },
                              { label: t('myOrders.dimensions'), value: detail.dimensions },
                              {
                                label: t('myOrders.finish'),
                                value: detail.finish_type
                                  ? finishLabel(detail.finish_type, t)
                                  : null
                              },
                              {
                                label: t('myOrders.inscription'),
                                value: detail.inscription_text,
                                wide: true
                              }
                            ]}
                          />
                        </DataSection>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
