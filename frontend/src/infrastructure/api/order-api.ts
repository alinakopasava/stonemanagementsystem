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
