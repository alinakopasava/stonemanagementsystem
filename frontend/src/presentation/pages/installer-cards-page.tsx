import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardCheck, MapPin, UserRound } from 'lucide-react';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { useTranslation } from '@application/i18n/i18n-context';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import {
  fetchInstallationCards,
  saveInstallationReport,
  type InstallationCard
} from '@infrastructure/api/installation-card-api';
import { ORDER_STATUSES, ORDER_STATUS_LABEL_KEYS } from '@domain/entities/order-status';
import { InstallationReportForm } from '@presentation/components/installation-report-form';
import { Header } from '@presentation/components/header';
import { DataFields, DataSection } from '@presentation/components/data-fields';

type CardFilter = 'all' | 'oczekujące' | 'w_realizacji' | 'zrealizowane' | 'anulowane';

const FILTERS: Array<{ id: CardFilter; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'installer.filter.all' },
  ...ORDER_STATUSES.map((id) => ({ id, labelKey: ORDER_STATUS_LABEL_KEYS[id] }))
];

const STATUS_LABELS: Record<string, TranslationKey> = ORDER_STATUS_LABEL_KEYS;

const STATUS_STYLES: Record<string, string> = {
  oczekujące: 'u-chip u-chip-active',
  w_realizacji: 'border-info bg-info-soft text-info',
  zrealizowane: 'border-positive bg-positive-soft text-positive',
  anulowane: 'border-critical bg-critical-soft text-critical'
};

/**
 * When the worklist was last read from the server.
 *
 * Kept in localStorage rather than in the cache itself: the crew needs to know
 * how old the list on screen is, and the service worker hands back a cached
 * response without saying when it was stored.
 */
const SYNCED_AT_KEY = 'installer.syncedAt';

const readSyncedAt = () => {
  try {
    return localStorage.getItem(SYNCED_AT_KEY);
  } catch {
    return null;
  }
};

const writeSyncedAt = (value: string) => {
  try {
    localStorage.setItem(SYNCED_AT_KEY, value);
  } catch {
    // A browser refusing storage costs the timestamp, not the worklist.
  }
};

export const InstallerCardsPage = () => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [cards, setCards] = useState<InstallationCard[]>([]);
  const [filter, setFilter] = useState<CardFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [syncedAt, setSyncedAt] = useState<string | null>(readSyncedAt);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCards(await fetchInstallationCards());
      // Offline the answer comes from the service worker's copy, which is not
      // news — only a reply that actually reached the server moves the clock.
      if (navigator.onLine) {
        const now = new Date().toISOString();
        writeSyncedAt(now);
        setSyncedAt(now);
      }
    } catch {
      setError(t('installer.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Follows the phone in and out of range.
   *
   * Coming back into signal reloads on its own: a crew that has just driven
   * off the cemetery should not have to know to pull the list down again.
   */
  useEffect(() => {
    const goneOffline = () => setIsOffline(true);
    const backOnline = () => {
      setIsOffline(false);
      void load();
    };

    window.addEventListener('offline', goneOffline);
    window.addEventListener('online', backOnline);
    return () => {
      window.removeEventListener('offline', goneOffline);
      window.removeEventListener('online', backOnline);
    };
  }, [load]);

  const visibleCards = useMemo(
    () => (filter === 'all' ? cards : cards.filter((card) => card.status === filter)),
    [cards, filter]
  );

  const statusLabel = (status: string) => {
    const key = STATUS_LABELS[status];
    return key ? t(key) : status;
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-brand" />
              <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('installer.title')}</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-3">{t('installer.subtitle')}</p>
            <span className="mt-3 inline-flex border border-line bg-surface-2 px-3 py-1 text-[10px] uppercase tracking-wider text-ink-2">
              {t('installer.readOnly')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="border border-line px-3 py-2 text-xs text-ink-2 transition hover:border-line-strong hover:text-ink"
          >
            {t('admin.common.refresh')}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`border px-3 py-1.5 text-xs transition ${
                filter === option.id
                  ? 'u-chip u-chip-active'
                  : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        {isOffline ? (
          <p className="mb-4 border border-notice bg-notice-soft px-3 py-2 text-sm text-notice">
            {syncedAt
              ? t('installer.offline', { date: new Date(syncedAt).toLocaleString(dateLocale) })
              : t('installer.offlineNoSync')}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mb-4 border border-critical bg-critical-soft px-3 py-2 text-sm text-critical"
          >
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="border border-line bg-surface p-8 text-center text-ink-3">
            {t('admin.common.loading')}
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="border border-line bg-surface p-8 text-center text-ink-3">
            {/* Nothing handed over is a different situation from a filter that
                happens to match none of the jobs waiting. */}
            {cards.length === 0 ? t('installer.empty') : t('installer.emptyFilter')}
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleCards.map((card) => (
              <article key={card.id} className="border border-line bg-surface p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-ink-3">
                      {t('installer.cardNumber')} {card.orderId.slice(0, 8)}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink-2">
                      <UserRound className="h-4 w-4 text-ink-3" />
                      {card.clientFullName || t('installer.unknownClient')}
                    </p>
                  </div>
                  <span
                    className={`border px-3 py-1 text-[10px] uppercase tracking-wider ${
                      STATUS_STYLES[card.status] ?? 'border-line bg-surface-2 text-ink-2'
                    }`}
                  >
                    {statusLabel(card.status)}
                  </span>
                </header>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border border-line bg-canvas p-3">
                    <p className="flex items-center gap-2 text-xs text-ink-3">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('installer.address')}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {card.installationAddress || t('installer.noAddress')}
                    </p>
                  </div>
                  <div className="border border-line bg-canvas p-3">
                    <p className="flex items-center gap-2 text-xs text-ink-3">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t('installer.deadline')}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {card.deadline
                        ? new Date(card.deadline).toLocaleDateString(dateLocale)
                        : t('installer.noDeadline')}
                    </p>
                  </div>
                </div>

                {/* Everything the administrator sees on the order, minus the
                    identity documents — an installation crew has no use for
                    a passport series and number. */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DataSection title={t('admin.field.clientSection')}>
                    <DataFields
                      placeholder={t('admin.field.notProvided')}
                      fields={[
                        {
                          label: t('admin.field.registeredName'),
                          value: [card.client.firstName, card.client.lastName]
                            .filter(Boolean)
                            .join(' ')
                        },
                        { label: t('admin.field.phone'), value: card.client.phoneNumber },
                        { label: t('admin.field.email'), value: card.client.email }
                      ]}
                    />
                  </DataSection>

                  {/* FM1 names what the crew gets: address, deadline, technical
                      data and contact details. Price and contract terms belong
                      to the commercial agreement and are not sent here at all —
                      the API omits them, so there is nothing to hide in the UI. */}
                  <DataSection title={t('admin.field.orderSection')}>
                    <DataFields
                      placeholder={t('admin.field.notProvided')}
                      fields={[
                        {
                          label: t('admin.field.submittedAt'),
                          value: card.submittedAt
                            ? new Date(card.submittedAt).toLocaleString(dateLocale)
                            : null
                        },
                        {
                          label: t('admin.field.updated'),
                          value: card.updatedAt
                            ? new Date(card.updatedAt).toLocaleString(dateLocale)
                            : null
                        }
                      ]}
                    />
                  </DataSection>
                </div>

                <div className="mt-3 space-y-3">
                  {card.orderDetails.length === 0 ? (
                    <p className="text-sm text-ink-3">{t('installer.noDetails')}</p>
                  ) : (
                    card.orderDetails.map((detail) => (
                      <DataSection key={detail.id} title={t('admin.field.configSection')}>
                        <p className="mb-2 font-medium text-ink">
                          {materialLabel(
                            detail.materials?.name,
                            t,
                            t('admin.orders.unknownMaterial')
                          )}
                        </p>
                        <DataFields
                          placeholder={t('admin.field.notProvided')}
                          fields={[
                            { label: t('admin.field.category'), value: detail.materials?.category },
                            { label: t('admin.orders.dimensions'), value: detail.dimensions },
                            {
                              label: t('admin.orders.finish'),
                              value: detail.finish_type ? finishLabel(detail.finish_type, t) : null
                            },
                            {
                              label: t('admin.orders.inscription'),
                              value: detail.inscription_text,
                              wide: true
                            }
                          ]}
                        />
                      </DataSection>
                    ))
                  )}
                </div>

                <InstallationReportForm
                  card={card}
                  onSave={async (input) => {
                    const report = await saveInstallationReport(card.orderId, input);
                    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, report } : c)));
                  }}
                  onReport={(report) =>
                    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, report } : c)))
                  }
                />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
