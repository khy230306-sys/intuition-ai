-- POKER DIRECTOR schema (Supabase / Postgres)
create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  email text unique,
  display_name text not null,
  role text not null check (role in ('admin','director','staff','player')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  address text,
  default_table_count int not null default 4,
  default_seats_per_table int not null default 9,
  currency text not null default 'KRW',
  language text not null default 'ko',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists venue_members (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  user_id uuid not null references users(id),
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz,
  unique (venue_id, user_id)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  name text not null,
  date date not null,
  start_time text not null,
  location text,
  max_players int not null,
  table_count int not null,
  seats_per_table int not null,
  starting_stack int not null,
  buy_in int not null,
  fee int not null default 0,
  guaranteed_prize int not null default 0,
  late_reg_level int not null default 6,
  estimated_end_time text,
  description text,
  format text not null,
  status text not null,
  rebuy jsonb not null default '{}',
  reentry jsonb not null default '{}',
  addon jsonb not null default '{}',
  bounty jsonb not null default '{}',
  blind_structure_id uuid,
  final_table_size int not null default 9,
  announcement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists blind_structures (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  name text not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists blind_levels (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references blind_structures(id) on delete cascade,
  level_number int not null,
  duration_minutes int not null,
  small_blind int not null default 0,
  big_blind int not null default 0,
  big_blind_ante int not null default 0,
  ante int not null default 0,
  is_break boolean not null default false,
  break_minutes int,
  is_registration_close boolean not null default false,
  is_rebuy_end boolean not null default false,
  is_addon_available boolean not null default false,
  is_chip_race boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  name text not null,
  nickname text,
  phone text,
  member_number text,
  avatar_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  player_id uuid not null references players(id),
  entry_number int not null,
  access_code text not null,
  status text not null,
  payment_status text not null,
  buy_in_amount int not null,
  rebuy_count int not null default 0,
  reentry_count int not null default 0,
  addon_count int not null default 0,
  current_table_id uuid,
  current_seat int,
  current_chips int not null default 0,
  bounty_amount int not null default 0,
  bounty_won int not null default 0,
  elimination_rank int,
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  eliminated_at timestamptz,
  notes text,
  is_seat_locked boolean not null default false,
  is_vip_seat boolean not null default false,
  exclude_from_balance boolean not null default false,
  avoid_player_ids uuid[] not null default '{}',
  last_moved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  number int not null,
  max_seats int not null,
  status text not null,
  dealer_button_seat int not null default 1,
  dealer_name text,
  is_break_candidate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists seats (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  table_id uuid not null references tables(id),
  seat_number int not null,
  entry_id uuid,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists table_movements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  entry_id uuid not null references tournament_entries(id),
  from_table_id uuid,
  from_seat int,
  to_table_id uuid not null,
  to_seat int not null,
  reason text,
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists eliminations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  entry_id uuid not null references tournament_entries(id),
  eliminated_by_entry_id uuid,
  level_number int not null,
  table_id uuid,
  rank int not null,
  eliminated_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists rebuys (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  entry_id uuid not null,
  cost int not null,
  chips int not null,
  level_number int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists reentries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  entry_id uuid not null,
  cost int not null,
  chips int not null,
  level_number int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists addons (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  entry_id uuid not null,
  cost int not null,
  chips int not null,
  level_number int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists bounties (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  from_entry_id uuid not null,
  to_entry_id uuid not null,
  amount int not null,
  level_number int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists prize_structures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  mode text not null,
  template_name text,
  operating_fee int not null default 0,
  extra_prize int not null default 0,
  payouts jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  entry_id uuid not null,
  place int not null,
  amount int not null,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  venue_id uuid not null,
  type text not null,
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists staff_requests (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  table_id uuid,
  type text not null,
  message text not null,
  status text not null,
  assignee_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists timer_states (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique,
  status text not null,
  current_level_index int not null default 0,
  level_started_at timestamptz,
  level_ends_at timestamptz,
  paused_remaining_ms bigint,
  muted boolean not null default false,
  last_tick_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  tournament_id uuid,
  action text not null,
  summary text not null,
  payload jsonb,
  undo_payload jsonb,
  can_undo boolean not null default false,
  undone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid,
  display_theme text not null default 'black_gold',
  language text not null default 'ko',
  sound_enabled boolean not null default true,
  voice_enabled boolean not null default true,
  vibration_enabled boolean not null default true,
  chip_colors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- MVP cloud sync blob (optional convenience table)
create table if not exists app_snapshots (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
