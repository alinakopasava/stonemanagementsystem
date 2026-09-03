import type { UserRole } from '@domain/entities/user-profile';
import { API_URL, apiFetch } from '@infrastructure/api/api-client';

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: string | null;
}

/** The customer behind an order or a card, as they registered themselves. */
export interface AdminClient {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: UserRole | null;
  registeredAt: string | null;
}

export interface AdminOrder {
  id: string;
  status: string | null;
  price: number | string | null;
  installation_address: string | null;
  contract_details: string | null;
  deadline: string | null;
  client_full_name: string | null;
  passport_series: string | null;
  passport_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  order_card_id: string | null;
  /** Present once the order has been handed to the crew. At most one row. */
  installation_cards: Array<{
    id: string;
    status: string | null;
    completion_timestamp: string | null;
  }> | null;
  /**
   * What the crew wrote down on site, once they have. FM2 asks for the report
   * to be readable in the office, which is the whole point of replacing the
   * telephone call it stands in for.
   */
  installation_report: {
    id: string;
    status: string | null;
    workerComments: string | null;
    /** Signed link into the private bucket; expires within the hour. */
    photoUrl: string | null;
    completionTimestamp: string | null;
  } | null;
  order_cards: {
    id: string;
    user_id: string | null;
    /** When the customer submitted the configuration this order grew out of. */
    created_at: string | null;
    order_details: Array<{
      id: string;
      material_id: string | null;
      dimensions: string | null;
      inscription_text: string | null;
      finish_type: string | null;
      /** The rest of the configuration. Null on cards submitted before 0010. */
      shape: string | null;
      inscription_style: string | null;
      slab_variant: string | null;
      slab_thickness_cm: number | string | null;
      base_height_cm: number | string | null;
      base_width_cm: number | string | null;
      base_depth_cm: number | string | null;
      decoration: string | null;
      has_cross: boolean | null;
      has_flowerbed: boolean | null;
      /** The customer's portrait, if they attached one (FK17). */
      photo_path: string | null;
      /** Signed link to that portrait; expires within the hour. */
      photo_url: string | null;
      materials: {
        id: string;
        name: string;
        category: string | null;
        price_per_m2: number | string | null;
      } | null;
    }>;
  } | null;
  client: AdminClient;
}

export const fetchAdminUsers = () =>
  apiFetch<{ data: AdminUser[] }>('/api/admin/users').then((r) => r.data);

export const updateUserRole = (userId: string, role: UserRole) =>
  apiFetch<{ data: { id: string; role: UserRole } }>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role }
  });

/**
 * Downloads the workshop's copy of a job as a PDF file.
 *
 * A file rather than a print dialog: the workshop has no account, so the office
 * forwards this by e-mail. `apiFetch` reads JSON, so the request goes through
 * `fetch` directly and the bytes are handed to the browser as a download.
 */
export const downloadWorkSheet = async (orderId: string, language: string) => {
  const response = await fetch(
    `${API_URL}/api/admin/orders/${orderId}/work-sheet.pdf?lang=${encodeURIComponent(language)}`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error(`Work sheet failed: ${response.status}`);
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `karta-pracy-${orderId.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: Safari reads the href after the click returns.
  setTimeout(() => URL.revokeObjectURL(href), 0);
};

export const fetchAdminOrders = () =>
  apiFetch<{ data: AdminOrder[] }>('/api/admin/orders').then((r) => r.data);

export interface AdminOrderCard {
  id: string;
  user_id: string | null;
  user_email: string | null;
  created_at: string | null;
  order_details: Array<{
    id: string;
    material_id: string | null;
    dimensions: string | null;
    inscription_text: string | null;
    finish_type: string | null;
    shape: string | null;
    inscription_style: string | null;
    slab_variant: string | null;
    slab_thickness_cm: number | string | null;
    base_height_cm: number | string | null;
    base_width_cm: number | string | null;
    base_depth_cm: number | string | null;
    decoration: string | null;
    has_cross: boolean | null;
    has_flowerbed: boolean | null;
    photo_path: string | null;
    photo_url: string | null;
    materials: { id: string; name: string; category: string | null; price_per_m2: number | null } | null;
  }>;
  client: AdminClient;
  converted_order: {
    id: string;
    status: string | null;
    price: number | string | null;
    deadline: string | null;
    created_at: string | null;
    order_card_id: string;
  } | null;
}

export interface ConvertOrderCardPayload {
  price?: number | string | null;
  installation_address?: string | null;
  contract_details?: string | null;
  deadline?: string | null;
  client_full_name?: string | null;
  passport_series?: string | null;
  passport_number?: string | null;
}

export const fetchAdminOrderCards = (converted?: boolean) => {
  const query =
    converted === undefined ? '' : `?converted=${converted ? 'true' : 'false'}`;
  return apiFetch<{ data: AdminOrderCard[] }>(`/api/admin/order-cards${query}`).then(
    (r) => r.data
  );
};

export const convertOrderCardToOrder = (
  cardId: string,
  payload: ConvertOrderCardPayload
) =>
  apiFetch<{ data: AdminOrder }>(`/api/admin/order-cards/${cardId}/convert`, {
    method: 'POST',
    body: payload
  });

export const deleteAdminOrderCard = (cardId: string) =>
  apiFetch<{ data: { id: string } }>(`/api/admin/order-cards/${cardId}`, {
    method: 'DELETE'
  });

export const updateOrderStatus = (orderId: string, status: string) =>
  apiFetch<{ data: { id: string; status: string; updated_at: string } }>(
    `/api/admin/orders/${orderId}/status`,
    { method: 'PATCH', body: { status } }
  );

export type ContactMessageStatus = 'new' | 'read' | 'archived';

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
  read_at: string | null;
  read_by: string | null;
}

export const fetchAdminContactMessages = (status?: ContactMessageStatus) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<{ data: AdminContactMessage[] }>(`/api/admin/contact-messages${query}`).then(
    (r) => r.data
  );
};

export const updateContactMessageStatus = (id: string, status: ContactMessageStatus) =>
  apiFetch<{
    data: { id: string; status: ContactMessageStatus; read_at: string | null; read_by: string | null };
  }>(`/api/admin/contact-messages/${id}`, {
    method: 'PATCH',
    body: { status }
  });

export const deleteContactMessage = (id: string) =>
  apiFetch<{ data: { id: string } }>(`/api/admin/contact-messages/${id}`, {
    method: 'DELETE'
  });

export const handOverOrderToInstaller = (orderId: string) =>
  apiFetch<{
    data: {
      alreadyHandedOver: boolean;
      installationCard: { id: string; status: string | null; completion_timestamp: string | null };
    };
  }>(`/api/admin/orders/${orderId}/hand-over`, { method: 'POST' }).then((r) => r.data);
