import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, HardHat } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import { DataFields, DataSection } from '@presentation/components/data-fields';
import {
  downloadWorkSheet,
  fetchAdminOrders,
  handOverOrderToInstaller,
  updateOrderStatus,
  type AdminOrder
} from '@infrastructure/api/admin-api';
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL_KEYS,
  type OrderStatus
} from '@domain/entities/order-status';

/**
 * Status zostaje w bazie jako enum w PL — tłumaczymy tylko etykietę pod nim.
 *
 * Biuro przestawia go ręcznie, bo tylko ono wie, co dzieje się ze zleceniem
 * między przyjęciem a montażem. Raport montera prowadzi osobne życie na
 * karcie montażowej i nie przepisuje się tutaj sam.
 */
const STATUS_OPTIONS = ORDER_STATUSES;

type OrderFilter = 'all' | OrderStatus;

/**
 * Filtr listy zamówień. Etykiety statusów są te same, których używa odznaka
 * obok zamówienia — jedno źródło nazw dla obu miejsc.
 */
const FILTERS: Array<{ id: OrderFilter; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'admin.orders.filter.all' },
  { id: 'oczekujące', labelKey: 'admin.orders.status.pending' },
  { id: 'w_realizacji', labelKey: 'admin.orders.status.inProgress' },
  { id: 'zrealizowane', labelKey: 'admin.orders.status.completed' },
  { id: 'anulowane', labelKey: 'admin.orders.status.cancelled' }
];

export const AdminOrdersPage = () => {
  const { t, language } = useTranslation();
  const { formatFromByn } = useCurrency();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handingOverId, setHandingOverId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const statusLabel = useMemo(
    () => (status: string) => {
      const key = ORDER_STATUS_LABEL_KEYS[status as OrderStatus];
      return key ? t(key) : status;
    },
    [t]
  );

  /**
   * Filtrujemy w przeglądarce, bo status przyjeżdża i tak z każdym
   * zamówieniem, a lista biura mieści się w jednym żądaniu.
   */
  const visibleOrders = useMemo(
    () =>
      filter === 'all' ? orders : orders.filter((o) => (o.status ?? 'oczekujące') === filter),
    [filter, orders]
  );

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

  /**
   * Fetches the workshop's copy of the job as a file.
   *
   * The document is drawn by the API, not by this page: the workshop has no
   * account, so the sheet leaves the building as an e-mail attachment, and a
   * browser cannot write a PDF to disk on its own.
   */
  const handleSheet = async (orderId: string) => {
    setSheetId(orderId);
    try {
      await downloadWorkSheet(orderId, language);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.orders.workshopSheetError'));
    } finally {
      setSheetId(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    const previous = orders;
    // Odznaka przeskakuje od razu, żeby lista nie migała przy zapisie;
    // nieudany zapis cofa ją do stanu sprzed kliknięcia.
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    setSavingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
    } catch (err) {
      setOrders(previous);
      alert(err instanceof Error ? err.message : t('admin.orders.updateError'));
    } finally {
      setSavingId(null);
    }
  };

  const handleHandOver = async (orderId: string) => {
    setHandingOverId(orderId);
    try {
      const { installationCard } = await handOverOrderToInstaller(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, installation_cards: [installationCard] } : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.orders.handOverError'));
    } finally {
      setHandingOverId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('admin.orders.title')}</h1>
          <p className="mt-1 text-sm text-ink-3">{t('admin.orders.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
        >
          {t('admin.common.refresh')}
        </button>
      </div>

      <div className="mb-4 flex overflow-hidden border border-line">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`px-3 py-1.5 text-xs transition ${
              filter === option.id
                ? 'bg-surface-2 text-ink'
                : 'text-ink-3 hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 border border-critical bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {t('admin.common.loading')}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {orders.length === 0 ? t('admin.orders.empty') : t('admin.orders.emptyFilter')}
          </div>
        ) : (
          visibleOrders.map((o) => {
            const details = o.order_cards?.order_details ?? [];
            const status = o.status ?? 'oczekujące';
            const handedOver = o.installation_cards?.[0] ?? null;
            return (
              <article key={o.id} className="border border-line bg-surface p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-ink-3">#{o.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-ink-3">
                      {t('admin.orders.created')}{' '}
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString(dateLocale)
                        : t('admin.common.unknown')}
                    </p>
                    <p className="text-xs text-ink-3">
                      {t('admin.orders.clientId')}{' '}
                      <span className="font-mono">{o.user_id?.slice(0, 8) ?? '-'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSheet(o.id)}
                      disabled={sheetId === o.id}
                      className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink-2 transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('admin.orders.workshopSheet')}
                    </button>
                    {handedOver ? (
                      <span className="inline-flex items-center gap-1.5 border border-info bg-info-soft px-3 py-1 text-[10px] uppercase tracking-wider text-info">
                        <HardHat className="h-3.5 w-3.5" />
                        {t('admin.orders.handedOver')} · {statusLabel(handedOver.status ?? '')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleHandOver(o.id)}
                        disabled={handingOverId === o.id}
                        className="inline-flex items-center gap-1.5 border border-info px-3 py-1.5 text-xs text-info transition hover:border-info hover:bg-info-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HardHat className="h-3.5 w-3.5" />
                        {handingOverId === o.id
                          ? t('admin.orders.handingOver')
                          : t('admin.orders.handOver')}
                      </button>
                    )}
                    <select
                      aria-label={t('admin.orders.changeStatus')}
                      value={status}
                      disabled={savingId === o.id}
                      onChange={(event) => handleStatusChange(o.id, event.target.value)}
                      className={`border px-3 py-1 text-[10px] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60 ${
                        ORDER_STATUS_BADGE[status as OrderStatus] ?? 'bg-surface-2 text-ink-2 border-line'
                      }`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {statusLabel(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </header>

                {/* FM2: what the crew recorded on site. Until this was
                    shown here the report reached the installer's screen and
                    stopped, which left the telephone call it was meant to
                    replace exactly where it was. */}
                {o.installation_report &&
                (o.installation_report.workerComments ||
                  o.installation_report.photoUrl ||
                  o.installation_report.completionTimestamp) ? (
                  <section className="mt-4 border border-info bg-info-soft/40 p-4">
                    <h3 className="text-[11px] uppercase tracking-wider text-info">
                      {t('admin.orders.installationReport')}
                    </h3>
                    {o.installation_report.completionTimestamp ? (
                      <p className="mt-1 text-xs text-ink-3">
                        {t('admin.orders.completedAt')}{' '}
                        {new Date(o.installation_report.completionTimestamp).toLocaleString(
                          dateLocale
                        )}
                      </p>
                    ) : null}
                    {o.installation_report.workerComments ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-ink">
                        {o.installation_report.workerComments}
                      </p>
                    ) : null}
                    {o.installation_report.photoUrl ? (
                      <img
                        src={o.installation_report.photoUrl}
                        alt={t('admin.orders.installationPhoto')}
                        className="mt-2 max-h-48 border border-line bg-surface-2 object-contain"
                      />
                    ) : null}
                  </section>
                ) : null}

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <DataSection title={t('admin.field.clientSection')}>
                    <DataFields
                      placeholder={t('admin.field.notProvided')}
                      fields={[
                        {
                          label: t('admin.field.registeredName'),
                          value: [o.client.firstName, o.client.lastName].filter(Boolean).join(' ')
                        },
                        { label: t('admin.field.contractName'), value: o.client_full_name },
                        { label: t('admin.field.phone'), value: o.client.phoneNumber },
                        { label: t('admin.field.email'), value: o.client.email },
                        {
                          label: t('admin.field.registeredAt'),
                          value: formatDate(o.client.registeredAt)
                        },
                        {
                          label: t('admin.field.passport'),
                          value: [o.passport_series, o.passport_number].filter(Boolean).join(' ')
                        },
                        { label: t('admin.orders.clientId'), value: o.user_id, mono: true }
                      ]}
                    />
                  </DataSection>

                  <DataSection title={t('admin.field.orderSection')}>
                    <DataFields
                      placeholder={t('admin.field.notProvided')}
                      fields={[
                        {
                          label: t('admin.field.submittedAt'),
                          value: formatDate(o.order_cards?.created_at ?? null, true)
                        },
                        { label: t('admin.field.price'), value: formatPrice(o.price) },
                        { label: t('admin.field.deadline'), value: formatDate(o.deadline) },
                        { label: t('admin.field.updated'), value: formatDate(o.updated_at, true) },
                        {
                          label: t('admin.field.orderCard'),
                          value: o.order_card_id,
                          mono: true
                        },
                        {
                          label: t('admin.field.installationAddress'),
                          value: o.installation_address,
                          wide: true
                        },
                        {
                          label: t('admin.field.contractDetails'),
                          value: o.contract_details,
                          wide: true
                        }
                      ]}
                    />
                  </DataSection>
                </div>

                {details.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-3">{t('admin.orders.noDetails')}</p>
                ) : (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {details.map((d) => (
                      <DataSection key={d.id} title={t('admin.field.configSection')}>
                        <p className="mb-2 font-medium text-ink">
                          {materialLabel(d.materials?.name, t, t('admin.orders.unknownMaterial'))}
                        </p>
                        <DataFields
                          placeholder={t('admin.field.notProvided')}
                          fields={[
                            { label: t('admin.field.category'), value: d.materials?.category },
                            {
                              label: t('admin.field.pricePerM2'),
                              value: formatPrice(d.materials?.price_per_m2 ?? null)
                            },
                            { label: t('admin.orders.dimensions'), value: d.dimensions },
                            {
                              label: t('admin.orders.finish'),
                              value: d.finish_type ? finishLabel(d.finish_type, t) : null
                            },
                            {
                              label: t('admin.orders.inscription'),
                              value: d.inscription_text,
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
          })
        )}
      </div>
    </div>
  );
};
