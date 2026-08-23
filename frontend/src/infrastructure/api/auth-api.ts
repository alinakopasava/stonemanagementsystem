import { apiFetch } from '@infrastructure/api/api-client';
import type { AuthUser } from '@domain/entities/user-profile';

export const fetchCurrentUser = () =>
  apiFetch<{ data: AuthUser }>('/api/me').then((payload) => payload.data);

export const signInRequest = (email: string, password: string) =>
  apiFetch<{ ok: true }>('/api/auth/sign-in', {
    method: 'POST',
    body: { email, password }
  });

export const signUpRequest = (input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}) =>
  apiFetch<{ ok: true; requiresEmailConfirmation: boolean }>('/api/auth/sign-up', {
    method: 'POST',
    body: input
  });

export const signOutRequest = () =>
  apiFetch<{ ok: true }>('/api/auth/sign-out', {
    method: 'POST'
  });

export const forgotPasswordRequest = (email: string) =>
  apiFetch<{ ok: true }>('/api/auth/forgot-password', {
    method: 'POST',
    body: { email }
  });

export const resetPasswordRequest = (password: string) =>
  apiFetch<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: { password }
  });

export const establishSessionRequest = (accessToken: string, refreshToken: string) =>
  apiFetch<{ ok: true }>('/api/auth/session', {
    method: 'POST',
    body: { accessToken, refreshToken }
  });
