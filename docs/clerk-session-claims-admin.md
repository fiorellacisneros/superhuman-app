# Admin role in Clerk session claims

So the middleware can block `/admin/*` without querying Supabase, the admin role is stored in **Clerk session claims** (from `publicMetadata`).

## 1. Clerk Dashboard — Session token

In [Clerk Dashboard](https://dashboard.clerk.com) → **Configure** → **Sessions** → **Customize session token**, add this so the JWT includes `metadata` from the user’s `public_metadata`:

```json
{
  "metadata": "{{user.public_metadata}}"
}
```

Save. New sessions will then include `sessionClaims.metadata.role` (e.g. `"admin"`).

## 2. Set your own user as admin (one-time)

Get your **Clerk User ID** from the Dashboard (**Users** → your user → copy ID, e.g. `user_2abc...`).

From the project root, with `.env` loaded (or export the vars):

```bash
# Option A: pass user ID as argument
CLERK_SECRET_KEY=sk_... node scripts/set-admin-role.mjs user_2abc...

# Option B: pass user ID via env
CLERK_USER_ID=user_2abc... CLERK_SECRET_KEY=sk_... node scripts/set-admin-role.mjs
```

To also set `users.role` in Supabase for that user:

```bash
CLERK_SECRET_KEY=sk_... \
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/set-admin-role.mjs user_2abc...
```

Then have the user **refresh the page** or **log out and log in again** so the new session token includes `metadata.role = "admin"`.

## 3. API: set another user’s role (admin only)

An admin can call `POST /api/admin/set-role` with a JSON body to set both Clerk `publicMetadata.role` and Supabase `users.role`:

```json
{
  "userId": "user_2abc...",
  "role": "admin"
}
```

Requester must already be admin (checked via Supabase `users.role`). Allowed `role` values: `"admin"`, `"student"`.
