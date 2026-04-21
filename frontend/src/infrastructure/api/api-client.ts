import { supabase } from '@infrastructure/auth/supabase-client';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

const buildHeaders = async (options: RequestOptions): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers ?? {})
  };

  if (options.auth !== false) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

export const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = await buildHeaders(options);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
    ) {
      message = (payload as { message: string }).message;
    }
    throw new Error(message);
  }

  return payload as T;
};
