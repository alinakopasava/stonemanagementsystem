/**
 * Runs before any test module is imported.
 *
 * `src/config/env.js` calls `process.exit(1)` when a required variable is
 * missing, so the whole configuration has to exist before the first import of
 * anything under `src/`.
 *
 * `TRUST_PROXY=true` is deliberate: it makes `getClientIp` honour
 * `X-Forwarded-For`, which lets each test present a unique client IP and get its
 * own rate-limit bucket. Without it every test shares one bucket and the suite
 * starts returning 429 halfway through for reasons unrelated to what is asserted.
 */
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SAMESITE = 'lax';
process.env.COOKIE_SECURE = 'false';
process.env.TRUST_PROXY = 'true';
process.env.PORT = '4999';
