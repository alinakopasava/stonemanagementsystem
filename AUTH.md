# Authentication & Authorization

This document describes the auth setup for Signature Stone and how to bring it online.

## Architecture

```
  Browser                Backend (Express)            Supabase
  -------                ------------------            --------
  supabase-js  <-- auth --------------------------->  Auth (JWT)
      |                                                   |
      |  fetch /api/...                                   |
      |  Authorization: Bearer <access_token>             |
      v                                                   |
  fetch --------> requireAuth middleware                  |
                    |  supabaseAdmin.auth.getUser(token)--+
                    |  loads profile + role
                    v
                  per-request client (anon key + JWT)
                    |
                    +--> Postgres (RLS enforced as auth.uid())
```

Key ideas:

- Supabase Auth owns sign-up / sign-in / sessions / password reset.
- The frontend stores the session in `localStorage` (key `signature-stone.auth`) and auto-refreshes tokens.
- Every call to our Express API sends `Authorization: Bearer <access_token>`.
- Express `requireAuth` middleware verifies the token with Supabase, loads the user's profile (including `role`), and creates a per-request Supabase client bound to that user's JWT. All DB operations run as that user, so **Row Level Security is the last line of defense**.
- The service role key lives only on the backend and is used only for JWT verification and admin tasks. It is never shipped to the browser.

## Roles

Enum `public.user_role`: `klient` (client), `monter` (installer), `admin`.

- Self sign-up always creates a `klient`. The DB trigger ignores any requested role.
- Promoting someone to `monter` or `admin` is a manual operation: update `public.profiles.role` in the Supabase SQL editor.

## One-time setup

1. **Rotate the service role key** in Supabase dashboard (Settings -> API) if it has ever been shared. The previous value must be considered compromised.
2. **Run the SQL migration** in Supabase SQL editor: `supabase/migrations/0001_auth_and_rls.sql`. This is idempotent.
3. **Configure Auth** in Supabase dashboard (Authentication -> URL Configuration):
   - Site URL: `http://localhost:5173` (add your production URL later)
   - Redirect URLs: `http://localhost:5173/auth/callback`, `http://localhost:5173/auth/reset-password`
4. **Enable email provider** (Authentication -> Providers -> Email) with "Confirm email" on.
5. **Fill env files**:
   - `backend/.env`: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and verify `SUPABASE_URL`)
   - `frontend/.env`: `VITE_SUPABASE_ANON_KEY` (and verify `VITE_SUPABASE_URL`)
6. Install + run:

```bash
# backend
cd backend && npm install && npm run dev
# frontend (separate terminal)
cd frontend && npm install --legacy-peer-deps && npm run dev
```

## Public vs protected endpoints

| Endpoint                | Auth | Notes |
|-------------------------|------|-------|
| `GET  /health`          | no   | Liveness |
| `GET  /api/materials`   | no   | Public catalog (RLS allows `anon` SELECT) |
| `GET  /api/me`          | yes  | Returns current user + profile |
| `POST /api/orders/submit` | yes | Creates an order as `auth.uid()` |

## Row Level Security summary

| Table | Client (`klient`) | Installer (`monter`) | Admin |
|-------|-------------------|----------------------|-------|
| `profiles` | read/update own row | read all | full |
| `materials`, `products` | read | read | full |
| `order_cards`, `order_details`, `orders` | read/insert own | read all, update status | full |
| `installation_cards` | read own (via `orders.user_id`) | full except delete | full |

See `supabase/migrations/0001_auth_and_rls.sql` for the exact policies.

## Promoting an admin / installer

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
