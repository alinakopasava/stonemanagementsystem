# Authentication & Authorization

This document describes the auth setup for Signature Stone and how to bring it online.

## Architecture

```
  Browser                         Backend (Express)                 Supabase
  -------                         ------------------                 --------
  POST /api/auth/sign-in  ----->  rate limit + origin check
                                  fresh anon client / password  ->  Auth
                                  Set-Cookie httpOnly  (access + refresh)
      |
      |  fetch /api/...  credentials: include
      v
  cookies --------------------->  requireAuth
                                    getUser(access cookie) / refresh
                                    loads profile + role
                                    per-request client (anon key + JWT)
                                    |
                                    +--> Postgres (RLS as auth.uid())
```

Key ideas:

- Sign-in, sign-up, and password reset go through Express so they can be rate-limited. Responses never include tokens.
- Session cookies are `httpOnly`, `SameSite=lax`, and `Secure` on HTTPS. The browser does not keep JWTs in `localStorage`.
- supabase-js on the frontend is used only to finish server-initiated email confirmation / recovery links. Supabase clears callback tokens from the URL immediately; the app validates and rotates them through `POST /api/auth/session`, then keeps the session only in httpOnly cookies.
- In development, Vite proxies `/api` to the backend so cookies are first-party. Leave `VITE_API_URL` unset.
- Express `requireAuth` verifies the JWT with Supabase, loads `profiles.role`, and creates a per-request client bound to that JWT. **Row Level Security is the last line of defense.**
- Admin table operations use that user-scoped client (RLS). The service role is only for JWT verification, `auth.users` emails, contact-form inserts, and audit logs.
- The service role key never ships to the browser.

## Roles

Enum `public.user_role`: `klient` (client), `monter` (installer), `admin`.

- Self sign-up always creates a `klient`. The DB trigger ignores any requested role.
- Promoting someone to `monter` or `admin` is a manual operation: update `public.profiles.role` in the Supabase SQL editor.

## One-time setup

1. **Rotate the service role key** in Supabase dashboard (Settings -> API) if it has ever been shared. The previous value must be considered compromised.
2. **Run the SQL migrations** in Supabase SQL editor: `0001_auth_and_rls.sql`, `0002_contact_messages.sql`, `0003_auth_hardening.sql`. They are idempotent.
3. **Configure Auth** in Supabase dashboard (Authentication -> URL Configuration):
   - Site URL: `http://localhost:5173` (add your production URL later)
   - Redirect URLs: `http://localhost:5173/auth/callback`, `http://localhost:5173/auth/reset-password`
4. **Enable email provider** (Authentication -> Providers -> Email) with "Confirm email" on.
5. **Enable leaked password protection** (Authentication -> Attack Protection / Password security → HaveIBeenPwned). This is a dashboard toggle, not SQL.
6. **Fill env files**:
   - `backend/.env`: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN=http://localhost:5173` (and verify `SUPABASE_URL`)
   - `frontend/.env`: `VITE_SUPABASE_ANON_KEY` (and verify `VITE_SUPABASE_URL`). Do **not** set `VITE_API_URL` in local dev.
   - Production behind a reverse proxy: `COOKIE_SECURE=true`, `TRUST_PROXY=true`. Split API host: `COOKIE_SAMESITE=none` plus HTTPS.
7. Install + run:

```bash
# backend
cd backend && npm install && npm run dev
# frontend (separate terminal)
cd frontend && npm install --legacy-peer-deps && npm run dev
```

## Public vs protected endpoints

| Endpoint | Auth | Notes |
|-------------------------|------|-------|
| `GET  /health` | no | Liveness |
| `GET  /api/materials` | no | Public catalog |
| `POST /api/auth/sign-in` | no | 5 attempts / minute / IP |
| `POST /api/contact` | no | 3 attempts / minute / IP |
| `GET  /api/me` | yes | Current user + profile |
| `POST /api/orders/submit` | yes | Creates an order as `auth.uid()` |
| `/api/admin/*` | admin | RLS + `requireRole('admin')` |

## Row Level Security summary

| Table | Client (`klient`) | Installer (`monter`) | Admin |
|-------|-------------------|----------------------|-------|
| `profiles` | read/update own row | read all | full |
| `materials`, `products` | read | read | full |
| `order_cards`, `order_details`, `orders` | read/insert own | read all, update status | full |
| `installation_cards` | read own (via `orders.user_id`) | full except delete | full |
| `audit_logs` | — | — | read |
| `contact_messages` | — | — | full |

See `supabase/migrations/` for the exact policies.

## Promoting an admin / installer

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
