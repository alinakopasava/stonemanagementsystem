import type { TranslationKey } from '@application/i18n/translations';

/**
 * The lifecycle of a production order.
 *
 * The values are Polish because they are the ones stored in the column, under
 * the CHECK constraint added in `0015_orders_status_domain.sql`; the interface
 * translates the label underneath, never the value. Four pages were each
 * carrying their own copy of this list, the same four keys and the same badge
 * palette — and the copies had already begun to drift in which of them offered
 * `anulowane`.
 */
export const ORDER_STATUSES = [
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

/**
 * Staff wording, used by the office panel, the installer worklist and the
 * report form. The customer's own panel deliberately says something else —
 * "Zbieranie informacji" rather than "Oczekujące" — so it keeps its own map.
 */
export const ORDER_STATUS_LABEL_KEYS: Record<OrderStatus, TranslationKey> = {
  oczekujące: 'admin.orders.status.pending',
  w_realizacji: 'admin.orders.status.inProgress',
  zrealizowane: 'admin.orders.status.completed',
  anulowane: 'admin.orders.status.cancelled'
};

/** One badge palette, so the same state is the same colour on every screen. */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  oczekujące: 'bg-brand-soft text-brand border-brand',
  w_realizacji: 'bg-info-soft text-info border-info',
  zrealizowane: 'bg-positive-soft text-positive border-positive',
  anulowane: 'bg-critical-soft text-critical border-critical'
};
