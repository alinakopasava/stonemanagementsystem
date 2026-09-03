import { API_URL, apiFetch } from '@infrastructure/api/api-client';

interface SubmitOrderPayload {
  materialId: string;
  dimensions: string;
  inscriptionText: string;
  finishType: string;
  /**
   * The rest of what the configurator built. Optional in the type because the
   * backend treats every one of them as optional, not because the designer
   * omits them — it sends the lot.
   */
  shape?: string;
  inscriptionStyle?: string;
  slabVariant?: string;
  slabThicknessCm?: number;
  baseHeightCm?: number;
  baseWidthCm?: number;
  baseDepthCm?: number;
  decoration?: string;
  hasCross?: boolean;
  hasFlowerbed?: boolean;
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

/**
 * Sends the portrait itself, as raw bytes with its own media type.
 *
 * `apiFetch` serialises everything as JSON, so this goes through `fetch`
 * directly: a base64 detour would inflate the file by a third and run into the
 * API's 100 kB JSON limit. Same shape as the installer's photo upload.
 */
export const uploadMonumentPhoto = async (orderCardId: string, photo: Blob) => {
  const response = await fetch(`${API_URL}/api/orders/${orderCardId}/photo`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': photo.type },
    body: photo
  });

  if (!response.ok) {
    throw new Error(`Photo upload failed: ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: { photoPath: string; photoUrl: string | null };
  } | null;

  return payload?.data ?? null;
};

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
