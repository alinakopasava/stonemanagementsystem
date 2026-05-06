import type { UserRole } from '@domain/entities/user-profile';
import { apiFetch } from '@infrastructure/api/api-client';

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: string | null;
}

export interface AdminOrder {
  id: string;
  status: string | null;
  price: number | string | null;
  installation_address: string | null;
  contract_details: string | null;
  deadline: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  order_card_id: string | null;
  order_cards: {
    id: string;
    user_id: string | null;
    order_details: Array<{
      id: string;
      material_id: string | null;
      dimensions: string | null;
      inscription_text: string | null;
      finish_type: string | null;
      materials: { id: string; name: string; category: string | null } | null;
    }>;
  } | null;
}

export const fetchAdminUsers = () =>
  apiFetch<{ data: AdminUser[] }>('/api/admin/users').then((r) => r.data);

export const updateUserRole = (userId: string, role: UserRole) =>
  apiFetch<{ data: { id: string; role: UserRole } }>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role }
  });

export const fetchAdminOrders = () =>
  apiFetch<{ data: AdminOrder[] }>('/api/admin/orders').then((r) => r.data);

export interface AdminOrderCard {
  id: string;
  user_id: string | null;
  user_email: string | null;
  order_details: Array<{
    id: string;
    material_id: string | null;
    dimensions: string | null;
    inscription_text: string | null;
    finish_type: string | null;
    materials: { id: string; name: string; category: string | null; price_per_m2: number | null } | null;
  }>;
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
