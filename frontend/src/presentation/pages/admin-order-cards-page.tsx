import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Trash2, X } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { finishLabel, materialLabel } from '@application/i18n/catalog-labels';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import { useCurrency } from '@application/currency/currency-context';
import {
  parseDimensionPair,
  parseThicknessCm,
  monumentPriceByn,
  type SlabVariant
} from '@application/pricing/monument-price';
import type { MonumentShape } from '@domain/entities/monument';
import type { FinishType } from '@domain/entities/order-card';
import { DataFields, DataSection } from '@presentation/components/data-fields';
import {
  convertOrderCardToOrder,
  deleteAdminOrderCard,
  fetchAdminOrderCards,
  type AdminOrderCard
} from '@infrastructure/api/admin-api';

/** Mirrors `CONVERT_FIELD_MAX_LENGTH` in the backend's admin service. */
const CONVERT_FIELD_MAX_LENGTH = {
  installation_address: 500,
  contract_details: 2000,
  client_full_name: 160,
  passport_series: 16,
  passport_number: 32
} as const;

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

/**
 * The figure the office starts from, computed from the stored configuration.
 *
 * It has to be the same sum the customer was shown in the configurator — the
 * two used to differ, because this one passed neither the shape nor anything
 * below the stela, and quietly suggested a lower price than the one the
 * customer had already seen.
 */
const suggestPrice = (card: AdminOrderCard): string => {
  const detail = card.order_details[0];
  if (!detail || !detail.materials?.price_per_m2 || !detail.dimensions) return '';
  const pair = parseDimensionPair(detail.dimensions);
  if (!pair) return '';

  const price = monumentPriceByn({
    pricePerM2: Number(detail.materials.price_per_m2),
    stela: { ...pair, thicknessCm: parseThicknessCm(detail.dimensions) },
    shape: (detail.shape as MonumentShape | null) ?? undefined,
    finish: (detail.finish_type as FinishType | null) ?? undefined,
    base:
      detail.base_height_cm !== null &&
      detail.base_width_cm !== null &&
      detail.base_depth_cm !== null
        ? {
            heightCm: Number(detail.base_height_cm),
            widthCm: Number(detail.base_width_cm),
            depthCm: Number(detail.base_depth_cm)
          }
        : null,
    slab: detail.slab_variant
      ? {
          variant: detail.slab_variant as SlabVariant,
          thicknessCm: Number(detail.slab_thickness_cm ?? 5)
        }
      : null,
    inscriptionLength: detail.inscription_text?.length ?? 0,
    decoration: detail.decoration,
    hasFlowerbed: detail.has_flowerbed,
    hasCross: detail.has_cross
  });
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
          <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('admin.orderCards.title')}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {t('admin.orderCards.subtitle')}
            {filter !== 'converted' && pendingCount > 0 ? (
              <span className="ml-2 bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {t('admin.orderCards.pendingBadge', { count: pendingCount })}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden border border-line">
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
          <button
            type="button"
            onClick={load}
            className="border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
          >
            {t('admin.common.refresh')}
          </button>
        </div>
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
        ) : cards.length === 0 ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {t('admin.orderCards.empty')}
          </div>
        ) : (
          cards.map((card) => (
            <article key={card.id} className="border border-line bg-surface p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
                    <FileText className="h-3.5 w-3.5" />
                    {t('admin.orderCards.cardNumber')}
                    {card.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">
                    {card.user_email ?? (
                      <span className="text-ink-3">{t('admin.orderCards.unknownUser')}</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-3">
                    {t('admin.orderCards.clientId')}{' '}
                    <span className="font-mono">{card.user_id?.slice(0, 8) ?? '-'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {card.converted_order ? (
                    <span className="border border-positive bg-positive-soft px-3 py-1 text-[10px] uppercase tracking-wider text-positive">
                      {t('admin.orderCards.convertedBadge', {
                        id: card.converted_order.id.slice(0, 8)
                      })}{' '}
                      · {card.converted_order.status ?? '-'}
                    </span>
                  ) : (
                    <span className="border border-brand bg-brand-soft px-3 py-1 text-[10px] uppercase tracking-wider text-brand">
                      {t('admin.orderCards.pendingStateBadge')}
                    </span>
                  )}
                </div>
              </header>

              {/* Only what the customer supplied themselves. Anything the office
                  adds — price, address, contract, documents — appears after the
                  card is converted, in the Orders tab. */}
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
                      { label: t('admin.field.email'), value: card.client.email },
                      {
                        label: t('admin.field.registeredAt'),
                        value: card.client.registeredAt
                          ? new Date(card.client.registeredAt).toLocaleDateString(dateLocale)
                          : null
                      },
                      { label: t('admin.orderCards.clientId'), value: card.user_id, mono: true }
                    ]}
                  />
                </DataSection>

                {card.order_details.length === 0 ? (
                  <p className="text-sm text-ink-3">{t('admin.orderCards.noDetails')}</p>
                ) : (
                  card.order_details.map((d) => (
                    <DataSection key={d.id} title={t('admin.field.configSection')}>
                      <p className="mb-2 font-medium text-ink">
                        {materialLabel(d.materials?.name, t, t('admin.orderCards.unknownMaterial'))}
                      </p>
                      <DataFields
                        placeholder={t('admin.field.notProvided')}
                        fields={[
                          { label: t('admin.field.category'), value: d.materials?.category },
                          {
                            label: t('admin.orderCards.pricePerM2'),
                            value:
                              d.materials?.price_per_m2 != null
                                ? `${formatFromByn(Number(d.materials.price_per_m2), { digits: 2 })} ${t('designer.priceUnit')}`
                                : null
                          },
                          { label: t('admin.orderCards.dimensions'), value: d.dimensions },
                          {
                            label: t('admin.orderCards.finish'),
                            value: d.finish_type ? finishLabel(d.finish_type, t) : null
                          },
                          {
                            label: t('admin.orderCards.inscription'),
                            value: d.inscription_text,
                            wide: true
                          }
                        ]}
                      />
                      {/* FK17: the photograph the customer attached for the
                          portrait. The link is signed and expires
                          within the hour, so it is minted per request rather
                          than stored. */}
                      {d.photo_url ? (
                        <figure className="mt-3">
                          <figcaption className="mb-1 text-[11px] uppercase tracking-wider text-ink-3">
                            {t('admin.orderCards.photo')}
                          </figcaption>
                          <img
                            src={d.photo_url}
                            alt={t('admin.orderCards.photo')}
                            className="max-h-48 border border-line bg-surface-2 object-contain"
                          />
                        </figure>
                      ) : null}
                    </DataSection>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {card.converted_order ? (
                  <span className="text-xs text-ink-3">
                    {card.converted_order.price != null
                      ? `${formatFromByn(Number(card.converted_order.price), { digits: 2 })} ${t('designer.priceUnit')}`
                      : t('admin.orderCards.noPrice')}
                    {card.converted_order.deadline
                      ? ` · ${t('admin.orderCards.dueLabel', {
                          date: new Date(card.converted_order.deadline).toLocaleDateString(
                            dateLocale
                          )
                        })}`
                      : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConvertModal(card)}
                    disabled={busyId === card.id}
                    className="u-btn u-btn-primary px-3 py-1.5 text-xs"
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
                    className="inline-flex items-center gap-1.5 border border-critical px-3 py-1.5 text-xs text-critical hover:border-critical hover:bg-critical-soft disabled:opacity-60"
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
          className="fixed inset-0 z-30 flex items-center justify-center bg-canvas p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="u-display text-2xl text-ink">{t('admin.orderCards.modalTitle')}</h2>
                <p className="mt-1 text-xs text-ink-3">
                  {t('admin.orderCards.cardNumber')}
                  {convertingCard.id.slice(0, 8)} ·{' '}
                  {convertingCard.user_email ?? t('admin.common.unknown')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConvertModal}
                className="p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label={t('admin.common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-3">
                  {t('admin.orderCards.price')}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full u-field"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder={t('admin.orderCards.pricePlaceholder')}
                />
                <span className="mt-1 block text-[11px] text-ink-3">
                  {t('admin.orderCards.priceHint')}
                </span>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-3">
                  {t('admin.orderCards.installationAddress')}
                </span>
                <input
                  type="text"
                  className="mt-1 w-full u-field"
                  maxLength={CONVERT_FIELD_MAX_LENGTH.installation_address}
                  value={form.installation_address}
                  onChange={(e) => setForm((p) => ({ ...p, installation_address: e.target.value }))}
                  placeholder={t('admin.orderCards.installationAddressPlaceholder')}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-3">
                  {t('admin.orderCards.contractDetails')}
                </span>
                <textarea
                  rows={3}
                  className="mt-1 w-full resize-y u-field"
                  maxLength={CONVERT_FIELD_MAX_LENGTH.contract_details}
                  value={form.contract_details}
                  onChange={(e) => setForm((p) => ({ ...p, contract_details: e.target.value }))}
                  placeholder={t('admin.orderCards.contractDetailsPlaceholder')}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-3">
                  {t('admin.orderCards.deadline')}
                </span>
                <input
                  type="date"
                  className="mt-1 w-full u-field"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-3">
                  {t('admin.orderCards.clientFullName')}
                </span>
                <input
                  type="text"
                  className="mt-1 w-full u-field"
                  maxLength={CONVERT_FIELD_MAX_LENGTH.client_full_name}
                  value={form.client_full_name}
                  onChange={(e) => setForm((p) => ({ ...p, client_full_name: e.target.value }))}
                  placeholder={t('admin.orderCards.clientFullNamePlaceholder')}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-3">
                    {t('admin.orderCards.passportSeries')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full u-field"
                    maxLength={CONVERT_FIELD_MAX_LENGTH.passport_series}
                  value={form.passport_series}
                    onChange={(e) => setForm((p) => ({ ...p, passport_series: e.target.value }))}
                    placeholder={t('admin.orderCards.passportSeriesPlaceholder')}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-3">
                    {t('admin.orderCards.passportNumber')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full u-field"
                    maxLength={CONVERT_FIELD_MAX_LENGTH.passport_number}
                  value={form.passport_number}
                    onChange={(e) => setForm((p) => ({ ...p, passport_number: e.target.value }))}
                    placeholder={t('admin.orderCards.passportNumberPlaceholder')}
                  />
                </label>
              </div>

              {convertError ? (
                <p className="border border-critical bg-critical-soft px-3 py-2 text-xs text-critical">
                  {convertError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeConvertModal}
                  className="border border-line px-3 py-2 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busyId === convertingCard.id}
                  className="u-btn u-btn-primary px-4 py-2"
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
