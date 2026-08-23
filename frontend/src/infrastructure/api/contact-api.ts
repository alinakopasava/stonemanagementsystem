import { apiFetch } from '@infrastructure/api/api-client';

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

interface ContactMessageResponse {
  message: string;
  data: { receivedAt: string };
}

export const submitContactMessage = (payload: ContactMessagePayload) =>
  apiFetch<ContactMessageResponse>('/api/contact', {
    method: 'POST',
    body: payload
  });
