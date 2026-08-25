import { defineConfig, devices } from '@playwright/test';

/**
 * 7.6  System tests.
 *
 * These run against the whole stack — client app, Express server and a real
 * Supabase project — so they are the only level that can observe real cookie
 * behaviour, data that survives a reload, and two roles meeting in one process.
 *
 * Prerequisites:
 *   1. npx playwright install chromium
 *   2. backend/.env and frontend/.env filled in (a test project, never production)
 *   3. E2E_ENABLED=true
 *
 * Run with:  npm run test:e2e
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  // A real database is shared state; parallel workers would fight over it.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // Kept for the failures that matter, discarded for the green runs.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Boots both halves of the stack unless something is already listening.
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: 'npm run dev --prefix ../backend',
          url: 'http://localhost:4000/health',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000
        },
        {
          command: 'npm run dev',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000
        }
      ]
});
