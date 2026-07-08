-- Logbook schema v1
-- Run this once in the Supabase SQL editor (SQL → New query → paste → Run).
--
-- Design: every area (trip/book/movie/series/concert) stores one row per
-- item in `entries` with the generic fields; area-specific fields live in
-- `entries.details` (jsonb). People, places, and dates are proper link
-- tables so cross-area views ("everything with Ana") stay one query.
-- Every table carries owner_id for a future multi-user migration; RLS
-- restricts all access to the signed-in owner.

-- ---------- people (shared across all areas) ----------
create table people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- places (countries, cities, venues) ----------
create table places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  kind text not null check (kind in ('country', 'city', 'venue')),
  name text not null,
  -- ISO 3166-1 alpha-2; set on countries and denormalized onto cities/venues
  country_code text,
  -- city → its country row, venue → its city row
  parent_id uuid references places (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- entries (generic item pattern) ----------
create table entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  area text not null check (area in ('trip', 'book', 'movie', 'series', 'concert')),
  title text not null,
  -- done-vs-wishlist plus area-specific statuses, e.g. book:
  -- 'want' | 'reading' | 'done' | 'dnf'; series: 'want' | 'watching' | 'done'
  status text not null,
  -- half-stars: 1–10 = 0.5–5 stars
  rating smallint check (rating between 1 and 10),
  notes text,
  -- where it came from / where it happened (bought, borrowed, cinema, home…)
  source text,
  -- area-specific fields (author, isbn, season/episode, lineup, …)
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_area_idx on entries (owner_id, area, status);

create function set_updated_at () returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger entries_updated before update on entries
  for each row execute function set_updated_at ();

-- ---------- link tables ----------
create table entry_people (
  entry_id uuid not null references entries (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  owner_id uuid not null default auth.uid () references auth.users (id),
  -- 'with' | 'suggested_by' | 'lent_by' | 'has_my_copy' | …
  role text not null default 'with',
  primary key (entry_id, person_id, role)
);

create table entry_dates (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries (id) on delete cascade,
  owner_id uuid not null default auth.uid () references auth.users (id),
  date date not null,
  -- 'on' | 'start' | 'finish' | 'planned'
  kind text not null default 'on',
  note text
);

create index entry_dates_entry_idx on entry_dates (entry_id);

create table entry_places (
  entry_id uuid not null references entries (id) on delete cascade,
  place_id uuid not null references places (id) on delete cascade,
  owner_id uuid not null default auth.uid () references auth.users (id),
  primary key (entry_id, place_id)
);

-- ---------- row level security ----------
alter table people enable row level security;
alter table places enable row level security;
alter table entries enable row level security;
alter table entry_people enable row level security;
alter table entry_dates enable row level security;
alter table entry_places enable row level security;

create policy "own rows" on people for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "own rows" on places for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "own rows" on entries for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "own rows" on entry_people for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "own rows" on entry_dates for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
create policy "own rows" on entry_places for all
  using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());
