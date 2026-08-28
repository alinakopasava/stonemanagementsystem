import { apiFetch } from '@infrastructure/api/api-client';

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Honeypot: always empty from a real form. The server drops it if filled. */
  website?: string;
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
