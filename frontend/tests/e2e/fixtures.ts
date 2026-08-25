import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the system tests.
 *
 * `E2E_ENABLED` gates the whole level: these tests create real accounts and
 * real rows. Running them by accident against a populated project would leave
 * debris behind, so they refuse to run until switched on explicitly.
 */
export const e2eEnabled = process.env.E2E_ENABLED === 'true';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

/** A fresh address per run, so re-runs never collide on an existing account. */
export const uniqueEmail = (prefix = 'e2e') =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.test`;

export const STRONG_PASSWORD = 'E2ePassword123';

/**
 * Existing accounts the role-dependent paths need. Self sign-up always yields a
 * `klient`, so an installer and an administrator have to be seeded beforehand
 * (see AUTH.md, "Promoting an admin / installer") and supplied here.
 */
export const seededAccounts = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? '',
    password: process.env.E2E_ADMIN_PASSWORD ?? ''
  },
  monter: {
    email: process.env.E2E_MONTER_EMAIL ?? '',
    password: process.env.E2E_MONTER_PASSWORD ?? ''
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? '',
    password: process.env.E2E_CLIENT_PASSWORD ?? ''
  }
};

export const hasStaffAccounts = Boolean(
  seededAccounts.admin.email && seededAccounts.monter.email
);

export const hasClientAccount = Boolean(seededAccounts.client.email);

/** Signs in through the real form and waits for the session to settle. */
export const signIn = async (page: Page, email: string, password: string) => {
  await page.goto('/sign-in');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/password|hasło|пароль/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|zaloguj|войти/i }).click();
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });
};

export const test = base;
export { expect };
