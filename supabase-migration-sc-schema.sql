-- Strength & Conditioning Program Schema
-- Phase I plan for a user
create table if not exists sc_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('PHASE_I')),
  anchor_monday date not null,
  games_per_week int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, phase)
);

create table if not exists sc_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references sc_plans(id) on delete cascade,
  date date not null,
  type text not null check (type in ('STRENGTH','AEROBIC','GAME','REST')),
  title text not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists sc_plan_sessions_plan_date_idx on sc_plan_sessions(plan_id, date);

create table if not exists sc_completions (
  id uuid primary key default gen_random_uuid(),
  plan_session_id uuid not null references sc_plan_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (plan_session_id, user_id)
);
