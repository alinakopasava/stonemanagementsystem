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

export const updateOrderStatus = (orderId: string, status: string) =>
  apiFetch<{ data: { id: string; status: string; updated_at: string } }>(
    `/api/admin/orders/${orderId}/status`,
    { method: 'PATCH', body: { status } }
  );
