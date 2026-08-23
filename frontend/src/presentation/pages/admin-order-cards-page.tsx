import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Trash2, X } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import { useCurrency } from '@application/currency/currency-context';
import { parseDimensionPair, monumentPriceByn } from '@application/pricing/monument-price';
import {
  convertOrderCardToOrder,
  deleteAdminOrderCard,
  fetchAdminOrderCards,
  type AdminOrderCard
} from '@infrastructure/api/admin-api';

type Filter = 'pending' | 'converted' | 'all';

const FILTERS: Array<{ id: Filter; labelKey: TranslationKey }> = [
  { id: 'pending', labelKey: 'admin.orderCards.filter.toProcess' },
  { id: 'converted', labelKey: 'admin.orderCards.filter.converted' },
  { id: 'all', labelKey: 'admin.orderCards.filter.all' }
];

const filterToConverted = (filter: Filter): boolean | undefined => {
  if (filter === 'pending') return false;
  if (filter === 'converted') return true;
  return undefined;
};

interface ConvertFormState {
  price: string;
  installation_address: string;
  contract_details: string;
  deadline: string;
  client_full_name: string;
  passport_series: string;
  passport_number: string;
}

const emptyForm: ConvertFormState = {
  price: '',
  installation_address: '',
  contract_details: '',
  deadline: '',
  client_full_name: '',
  passport_series: '',
  passport_number: ''
};

const suggestPrice = (card: AdminOrderCard): string => {
  const detail = card.order_details[0];
  if (!detail || !detail.materials?.price_per_m2 || !detail.dimensions) return '';
  const dimensions = parseDimensionPair(detail.dimensions);
  if (!dimensions) return '';
  const price = monumentPriceByn(Number(detail.materials.price_per_m2), dimensions);
  return Number.isFinite(price) ? price.toFixed(2) : '';
};

export const AdminOrderCardsPage = () => {
  const { t, language } = useTranslation();
  const { formatFromByn } = useCurrency();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [cards, setCards] = useState<AdminOrderCard[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [convertingCard, setConvertingCard] = useState<AdminOrderCard | null>(null);
  const [form, setForm] = useState<ConvertFormState>(emptyForm);
  const [convertError, setConvertError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAdminOrderCards(filterToConverted(filter));
      setCards(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.orderCards.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => cards.filter((c) => c.converted_order === null).length,
    [cards]
  );

  const openConvertModal = (card: AdminOrderCard) => {
    setConvertingCard(card);
    setConvertError(null);
    setForm({
      ...emptyForm,
      price: suggestPrice(card)
    });
  };

  const closeConvertModal = () => {
    setConvertingCard(null);
    setConvertError(null);
    setForm(emptyForm);
  };

  const handleConvertSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!convertingCard) return;

    setBusyId(convertingCard.id);
    setConvertError(null);
    try {
      await convertOrderCardToOrder(convertingCard.id, {
        price: form.price === '' ? null : Number(form.price),
        installation_address: form.installation_address || null,
        contract_details: form.contract_details || null,
        deadline: form.deadline || null,
        client_full_name: form.client_full_name || null,
        passport_series: form.passport_series || null,
        passport_number: form.passport_number || null
      });
      closeConvertModal();
      await load();
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : t('admin.orderCards.convertError'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (card: AdminOrderCard) => {
    if (card.converted_order) {
      alert(t('admin.orderCards.alreadyOrdered'));
      return;
    }
    if (!confirm(t('admin.orderCards.deleteConfirm'))) return;

    setBusyId(card.id);
    try {
      await deleteAdminOrderCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.orderCards.deleteError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">{t('admin.orderCards.title')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('admin.orderCards.subtitle')}
            {filter !== 'converted' && pendingCount > 0 ? (
              <span className="ml-2 rounded-full bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
                {t('admin.orderCards.pendingBadge', { count: pendingCount })}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-slate-700">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 text-xs transition ${
                  filter === option.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
          >
            {t('admin.common.refresh')}
          </button>
        </div>
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
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            {t('admin.orderCards.empty')}
          </div>
        ) : (
          cards.map((card) => (
            <article
              key={card.id}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    {t('admin.orderCards.cardNumber')}
                    {card.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {card.user_email ?? (
                      <span className="text-slate-500">
                        {t('admin.orderCards.unknownUser')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('admin.orderCards.clientId')}{' '}
                    <span className="font-mono">{card.user_id?.slice(0, 8) ?? '—'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {card.converted_order ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-wider text-emerald-200">
                      {t('admin.orderCards.convertedBadge', {
                        id: card.converted_order.id.slice(0, 8)
                      })}{' '}
                      · {card.converted_order.status ?? '—'}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] uppercase tracking-wider text-amber-200">
                      {t('admin.orderCards.pendingStateBadge')}
                    </span>
                  )}
                </div>
              </header>

              {card.order_details.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t('admin.orderCards.noDetails')}</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {card.order_details.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300"
                    >
                      <p className="font-medium text-slate-100">
                        {materialLabel(d.materials?.name, t, t('admin.orderCards.unknownMaterial'))}
                      </p>
                      <dl className="mt-1 grid grid-cols-[100px_1fr] gap-y-0.5">
                        <dt className="text-slate-500">{t('admin.orderCards.dimensions')}</dt>
                        <dd>{d.dimensions ?? '—'}</dd>
                        <dt className="text-slate-500">{t('admin.orderCards.finish')}</dt>
                        <dd>{finishLabel(d.finish_type, t)}</dd>
                        <dt className="text-slate-500">{t('admin.orderCards.pricePerM2')}</dt>
                        <dd>
                          {d.materials?.price_per_m2 != null
                            ? `${formatFromByn(Number(d.materials.price_per_m2), { digits: 2 })} ${t('designer.priceUnit')}`
                            : '—'}
                        </dd>
                        <dt className="text-slate-500">{t('admin.orderCards.inscription')}</dt>
                        <dd className="italic text-slate-200">
                          {d.inscription_text ?? '—'}
                        </dd>
                      </dl>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {card.converted_order ? (
                  <span className="text-xs text-slate-400">
                    {card.converted_order.price != null
                      ? `${formatFromByn(Number(card.converted_order.price), { digits: 2 })} ${t('designer.priceUnit')}`
                      : t('admin.orderCards.noPrice')}
                    {card.converted_order.deadline
                      ? ` · ${t('admin.orderCards.dueLabel', {
                          date: new Date(card.converted_order.deadline).toLocaleDateString(dateLocale)
                        })}`
                      : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConvertModal(card)}
                    disabled={busyId === card.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  >
                    {t('admin.orderCards.convertButton')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {!card.converted_order ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(card)}
                    disabled={busyId === card.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 hover:border-rose-400 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('admin.common.delete')}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {convertingCard ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-2xl text-gray-100">
                  {t('admin.orderCards.modalTitle')}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {t('admin.orderCards.cardNumber')}
                  {convertingCard.id.slice(0, 8)} ·{' '}
                  {convertingCard.user_email ?? t('admin.common.unknown')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConvertModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={t('admin.common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {t('admin.orderCards.price')}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder={t('admin.orderCards.pricePlaceholder')}
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  {t('admin.orderCards.priceHint')}
                </span>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {t('admin.orderCards.installationAddress')}
                </span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.installation_address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, installation_address: e.target.value }))
                  }
                  placeholder={t('admin.orderCards.installationAddressPlaceholder')}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {t('admin.orderCards.contractDetails')}
                </span>
                <textarea
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.contract_details}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contract_details: e.target.value }))
                  }
                  placeholder={t('admin.orderCards.contractDetailsPlaceholder')}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {t('admin.orderCards.deadline')}
                </span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  {t('admin.orderCards.clientFullName')}
                </span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.client_full_name}
                  onChange={(e) => setForm((p) => ({ ...p, client_full_name: e.target.value }))}
                  placeholder={t('admin.orderCards.clientFullNamePlaceholder')}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    {t('admin.orderCards.passportSeries')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                    value={form.passport_series}
                    onChange={(e) => setForm((p) => ({ ...p, passport_series: e.target.value }))}
                    placeholder={t('admin.orderCards.passportSeriesPlaceholder')}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    {t('admin.orderCards.passportNumber')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                    value={form.passport_number}
                    onChange={(e) => setForm((p) => ({ ...p, passport_number: e.target.value }))}
                    placeholder={t('admin.orderCards.passportNumberPlaceholder')}
                  />
                </label>
              </div>

              {convertError ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {convertError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeConvertModal}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busyId === convertingCard.id}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {busyId === convertingCard.id
                    ? t('admin.orderCards.converting')
                    : t('admin.orderCards.createOrder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
