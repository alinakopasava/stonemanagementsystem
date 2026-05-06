import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Trash2, X } from 'lucide-react';
import {
  convertOrderCardToOrder,
  deleteAdminOrderCard,
  fetchAdminOrderCards,
  type AdminOrderCard
} from '@infrastructure/api/admin-api';

type Filter = 'pending' | 'converted' | 'all';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'pending', label: 'To process' },
  { id: 'converted', label: 'Converted' },
  { id: 'all', label: 'All' }
];

const filterToConverted = (filter: Filter): boolean | undefined => {
  if (filter === 'pending') return false;
  if (filter === 'converted') return true;
  return undefined;
};

const formatPrice = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
};

interface ConvertFormState {
  price: string;
  installation_address: string;
  contract_details: string;
  deadline: string;
}

const emptyForm: ConvertFormState = {
  price: '',
  installation_address: '',
  contract_details: '',
  deadline: ''
};

const suggestPrice = (card: AdminOrderCard): string => {
  const detail = card.order_details[0];
  if (!detail || !detail.materials?.price_per_m2 || !detail.dimensions) return '';
  const [a, b] = detail.dimensions.toLowerCase().split('x').map((v) => Number(v.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  const areaM2 = (a / 100) * (b / 100);
  const price = areaM2 * Number(detail.materials.price_per_m2);
  return Number.isFinite(price) ? price.toFixed(2) : '';
};

export const AdminOrderCardsPage = () => {
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
      setError(err instanceof Error ? err.message : 'Failed to load order cards.');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

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
        deadline: form.deadline || null
      });
      closeConvertModal();
      await load();
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (card: AdminOrderCard) => {
    if (card.converted_order) {
      alert('This card already has an order. Delete the order first.');
      return;
    }
    if (!confirm('Delete this order card and its details? This cannot be undone.')) return;

    setBusyId(card.id);
    try {
      await deleteAdminOrderCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete order card.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">Order cards</h1>
          <p className="mt-1 text-sm text-slate-400">
            Drafts submitted from the configurator. Review the design, then convert
            into a real order with price, address and deadline.
            {filter !== 'converted' && pendingCount > 0 ? (
              <span className="ml-2 rounded-full bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
                {pendingCount} pending
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
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Refresh
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
            Loading...
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            No order cards.
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
                    Card #{card.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {card.user_email ?? <span className="text-slate-500">unknown user</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    Client id:{' '}
                    <span className="font-mono">{card.user_id?.slice(0, 8) ?? '—'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {card.converted_order ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-wider text-emerald-200">
                      Converted · #{card.converted_order.id.slice(0, 8)} ·{' '}
                      {card.converted_order.status ?? '—'}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] uppercase tracking-wider text-amber-200">
                      Pending
                    </span>
                  )}
                </div>
              </header>

              {card.order_details.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">No details on this card.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {card.order_details.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300"
                    >
                      <p className="font-medium text-slate-100">
                        {d.materials?.name ?? 'Unknown material'}
                      </p>
                      <dl className="mt-1 grid grid-cols-[100px_1fr] gap-y-0.5">
                        <dt className="text-slate-500">Dimensions</dt>
                        <dd>{d.dimensions ?? '—'}</dd>
                        <dt className="text-slate-500">Finish</dt>
                        <dd>{d.finish_type ?? '—'}</dd>
                        <dt className="text-slate-500">Price/m²</dt>
                        <dd>
                          {d.materials?.price_per_m2 != null
                            ? `${Number(d.materials.price_per_m2).toFixed(2)} PLN`
                            : '—'}
                        </dd>
                        <dt className="text-slate-500">Inscription</dt>
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
                      ? `${formatPrice(card.converted_order.price)} PLN`
                      : 'No price set'}
                    {card.converted_order.deadline
                      ? ` · due ${new Date(card.converted_order.deadline).toLocaleDateString()}`
                      : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConvertModal(card)}
                    disabled={busyId === card.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  >
                    Convert to order
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
                    Delete
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
                <h2 className="font-serif text-2xl text-gray-100">Convert to order</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Card #{convertingCard.id.slice(0, 8)} ·{' '}
                  {convertingCard.user_email ?? 'unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConvertModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Price (PLN)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="e.g. 4250.00"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Suggested from material × area. Leave blank if not yet known.
                </span>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Installation address
                </span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.installation_address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, installation_address: e.target.value }))
                  }
                  placeholder="Street, city, cemetery..."
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Contract details
                </span>
                <textarea
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.contract_details}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contract_details: e.target.value }))
                  }
                  placeholder="Special arrangements, payment schedule, notes..."
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Deadline
                </span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </label>

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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === convertingCard.id}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {busyId === convertingCard.id ? 'Converting...' : 'Create order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
