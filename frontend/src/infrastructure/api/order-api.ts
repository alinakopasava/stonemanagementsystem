import { apiFetch } from '@infrastructure/api/api-client';

interface SubmitOrderPayload {
  materialId: string;
  dimensions: string;
  inscriptionText: string;
  finishType: string;
}

interface SubmitOrderResponse {
  message: string;
  data: {
    orderCard: { id: string; user_id: string };
    orderDetails: Record<string, unknown>;
  };
}

export const submitOrderRequest = (payload: SubmitOrderPayload) =>
  apiFetch<SubmitOrderResponse>('/api/orders/submit', {
    method: 'POST',
    body: payload
  });

/** One configuration the customer submitted, plus the order it became. */
export interface MyOrder {
  id: string;
  submitted_at: string | null;
  order_details: Array<{
    id: string;
    dimensions: string | null;
    inscription_text: string | null;
    finish_type: string | null;
    materials: {
      id: string;
      name: string;
      category: string | null;
      price_per_m2: number | string | null;
    } | null;
  }>;
  /** `null` until the office turns the submission into an order. */
  order: {
    id: string;
    status: string | null;
    price: number | string | null;
    deadline: string | null;
    installation_address: string | null;
    created_at: string | null;
    updated_at: string | null;
    order_card_id: string;
  } | null;
}

export const fetchMyOrders = () =>
  apiFetch<{ data: MyOrder[] }>('/api/orders/mine').then((r) => r.data);
