-- Cpex Hoarafushi / IslandPost — initial schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Extensions
create extension if not exists "pgcrypto";

-- ─── Users (app staff accounts; separate from auth.users) ───
create table if not exists public.users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff', 'customer')),
  full_name text not null,
  created_at timestamptz not null default now(),
  last_login timestamptz,
  is_active boolean not null default true
);

create index if not exists users_username_idx on public.users (lower(username));

-- ─── Parcels ─────────────────────────────────────────────────
create table if not exists public.parcels (
  id text primary key,
  tracking_number text not null,
  customer_name text not null,
  mobile_number text not null default '',
  address text not null default '',
  island text not null default '',
  description text not null default '',
  arrival_date date,
  courier_name text not null default '',
  status text not null default 'Pending',
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  delivered_by text,
  receiver_name text,
  import_batch_id text
);

create index if not exists parcels_tracking_idx on public.parcels (lower(tracking_number));
create index if not exists parcels_customer_idx on public.parcels (lower(customer_name));
create index if not exists parcels_status_idx on public.parcels (status);

-- ─── Activity log ────────────────────────────────────────────
create table if not exists public.activity (
  id text primary key,
  user_id text not null,
  username text not null,
  action text not null,
  target text not null,
  details text not null default '',
  timestamp timestamptz not null default now()
);

create index if not exists activity_timestamp_idx on public.activity (timestamp desc);

-- ─── App settings (single row) ───────────────────────────────
create table if not exists public.settings (
  id int primary key default 1,
  office_name text not null default 'Cpex Hoarafushi',
  island_name text not null default 'Hoarafushi, Maldives',
  contact_number text not null default '+960 300-0000',
  email_address text not null default 'info@islandpost.mv',
  logo_text text not null default 'IslandPost',
  dark_mode boolean not null default false,
  auto_backup boolean not null default true,
  session_timeout int not null default 60,
  constraint settings_singleton check (id = 1)
);

-- ─── Import batches ──────────────────────────────────────────
create table if not exists public.batches (
  id text primary key,
  filename text not null,
  imported_at timestamptz not null default now(),
  imported_by text not null,
  total_rows int not null default 0,
  success_rows int not null default 0,
  error_rows int not null default 0,
  errors jsonb not null default '[]'::jsonb
);

-- ─── Delivery records ────────────────────────────────────────
create table if not exists public.deliveries (
  id text primary key,
  parcel_id text not null references public.parcels (id) on delete cascade,
  tracking_number text not null,
  customer_name text not null,
  delivered_at timestamptz not null default now(),
  delivered_by text not null,
  receiver_name text not null,
  staff_notes text
);

create index if not exists deliveries_parcel_idx on public.deliveries (parcel_id);

-- ─── Row Level Security (permissive for custom app auth via anon key) ───
alter table public.users enable row level security;
alter table public.parcels enable row level security;
alter table public.activity enable row level security;
alter table public.settings enable row level security;
alter table public.batches enable row level security;
alter table public.deliveries enable row level security;

create policy "anon_all_users" on public.users for all to anon using (true) with check (true);
create policy "anon_all_parcels" on public.parcels for all to anon using (true) with check (true);
create policy "anon_all_activity" on public.activity for all to anon using (true) with check (true);
create policy "anon_all_settings" on public.settings for all to anon using (true) with check (true);
create policy "anon_all_batches" on public.batches for all to anon using (true) with check (true);
create policy "anon_all_deliveries" on public.deliveries for all to anon using (true) with check (true);

create policy "authenticated_all_users" on public.users for all to authenticated using (true) with check (true);
create policy "authenticated_all_parcels" on public.parcels for all to authenticated using (true) with check (true);
create policy "authenticated_all_activity" on public.activity for all to authenticated using (true) with check (true);
create policy "authenticated_all_settings" on public.settings for all to authenticated using (true) with check (true);
create policy "authenticated_all_batches" on public.batches for all to authenticated using (true) with check (true);
create policy "authenticated_all_deliveries" on public.deliveries for all to authenticated using (true) with check (true);

-- ─── Default settings row ────────────────────────────────────
insert into public.settings (id, office_name, island_name)
values (1, 'Cpex Hoarafushi', 'Hoarafushi, Maldives')
on conflict (id) do nothing;

-- ─── Seed admin & staff (passwords: admin123 / staff123) ─────
insert into public.users (id, username, password_hash, role, full_name, is_active)
values
  (
    'seed-admin',
    'admin',
    'YWRtaW4xMjNfaXNsYW5kcG9zdF9zYWx0',
    'admin',
    'System Administrator',
    true
  ),
  (
    'seed-staff1',
    'staff1',
    'c3RhZmYxMjNfaXNsYW5kcG9zdF9zYWx0',
    'staff',
    'Ahmed Rasheed',
    true
  )
on conflict (username) do nothing;

-- ─── Demo parcel ─────────────────────────────────────────────
insert into public.parcels (
  id,
  tracking_number,
  customer_name,
  mobile_number,
  address,
  island,
  description,
  arrival_date,
  courier_name,
  status,
  remarks,
  import_batch_id
)
values (
  'seed-parcel-001',
  'DHL-2024-001',
  'Fathimath Ali',
  '7891234',
  'Hulhumale, Block A',
  'Hulhumale',
  'Electronics - Laptop',
  (current_date - interval '2 days')::date,
  'DHL',
  'Ready for Collection',
  'Fragile - Handle with care',
  'demo'
)
on conflict (id) do nothing;
