import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardCheck, MapPin, UserRound } from 'lucide-react';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { useTranslation } from '@application/i18n/i18n-context';
import {
  LANGUAGE_LOCALES,
  type TranslationKey
} from '@application/i18n/translations';
import {
  fetchInstallationCards,
  type InstallationCard
} from '@infrastructure/api/installation-card-api';
import { Header } from '@presentation/components/header';

type CardFilter = 'all' | 'oczekujące' | 'w_realizacji' | 'zrealizowane' | 'anulowane';

const FILTERS: Array<{ id: CardFilter; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'installer.filter.all' },
  { id: 'oczekujące', labelKey: 'admin.orders.status.pending' },
  { id: 'w_realizacji', labelKey: 'admin.orders.status.inProgress' },
  { id: 'zrealizowane', labelKey: 'admin.orders.status.completed' },
  { id: 'anulowane', labelKey: 'admin.orders.status.cancelled' }
];

const STATUS_LABELS: Record<string, TranslationKey> = {
  oczekujące: 'admin.orders.status.pending',
  w_realizacji: 'admin.orders.status.inProgress',
  zrealizowane: 'admin.orders.status.completed',
  anulowane: 'admin.orders.status.cancelled'
};

const STATUS_STYLES: Record<string, string> = {
  oczekujące: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  w_realizacji: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  zrealizowane: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  anulowane: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

export const InstallerCardsPage = () => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [cards, setCards] = useState<InstallationCard[]>([]);
  const [filter, setFilter] = useState<CardFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCards(await fetchInstallationCards());
    } catch {
      setError(t('installer.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
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
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-amber-300" />
              <h1 className="font-serif text-3xl text-gray-100">{t('installer.title')}</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {t('installer.subtitle')}
            </p>
            <span className="mt-3 inline-flex rounded-full border border-slate-600 bg-slate-800/70 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-300">
              {t('installer.readOnly')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
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
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                filter === option.id
                  ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-8 text-center text-slate-400">
            {t('admin.common.loading')}
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-8 text-center text-slate-400">
            {t('installer.empty')}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleCards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-slate-500">
                      {t('installer.cardNumber')} {card.orderId.slice(0, 8)}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                      <UserRound className="h-4 w-4 text-slate-500" />
                      {card.clientFullName || t('installer.unknownClient')}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                      STATUS_STYLES[card.status] ??
                      'border-slate-700 bg-slate-800 text-slate-200'
                    }`}
                  >
                    {statusLabel(card.status)}
                  </span>
                </header>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <dt className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('installer.address')}
                    </dt>
                    <dd className="mt-1 text-slate-200">
                      {card.installationAddress || t('installer.noAddress')}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <dt className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t('installer.deadline')}
                    </dt>
                    <dd className="mt-1 text-slate-200">
                      {card.deadline
                        ? new Date(card.deadline).toLocaleDateString(dateLocale)
                        : t('installer.noDeadline')}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3">
                  {card.orderDetails.length === 0 ? (
                    <p className="text-sm text-slate-400">{t('installer.noDetails')}</p>
                  ) : (
                    card.orderDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
                      >
                        <p className="font-medium text-slate-100">
                          {materialLabel(
                            detail.materials?.name,
                            t,
                            t('admin.orders.unknownMaterial')
                          )}
                        </p>
                        <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-slate-300">
                          <dt className="text-slate-500">{t('admin.orders.dimensions')}</dt>
                          <dd>{detail.dimensions ?? '—'}</dd>
                          <dt className="text-slate-500">{t('admin.orders.finish')}</dt>
                          <dd>{finishLabel(detail.finish_type, t)}</dd>
                          <dt className="text-slate-500">{t('admin.orders.inscription')}</dt>
                          <dd className="italic text-slate-200">
                            {detail.inscription_text ?? '—'}
                          </dd>
                        </dl>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
