# Supabase setup — Cpex Hoarafushi

## 1. Create tables

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run the full script: `supabase/migrations/001_initial_schema.sql`.

This creates: `users`, `parcels`, `activity`, `settings`, `batches`, `deliveries` with RLS policies.

## 2. Environment variables

In **Project Settings → API**, copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Local development

Copy `.env.example` to `.env` and fill in the values.

### GitHub Pages

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy (push to `main` or run the deploy workflow).

## 3. Default logins (after migration SQL)

| Username | Password   | Role  |
|----------|------------|-------|
| admin    | admin123   | admin |
| staff1   | staff123   | staff |

## 4. Verify

- Table Editor should show rows in `users` and `parcels`.
- Customer portal search: try `Fathimath` or `DHL-2024-001`.
- Admin login with `admin` / `admin123`.

## Notes

- Sessions stay in the browser (`localStorage`); only parcel/user data syncs to Supabase.
- If Supabase is unreachable, the app falls back to browser storage automatically.
