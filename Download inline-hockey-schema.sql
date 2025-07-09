
-- Table: players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthdate date,
  gender text check (gender in ('male', 'female', 'other')),
  phone text,
  email text,
  created_at timestamp with time zone default now()
);

-- Table: sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time not null,
  location text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Table: session_plans
create table if not exists session_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  title text,
  description text,
  drills jsonb,
  created_at timestamp with time zone default now()
);

-- Table: attendance
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  status text check (status in ('present', 'absent', 'excused')) not null,
  note text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (optional, configure policies separately)
alter table players enable row level security;
alter table sessions enable row level security;
alter table session_plans enable row level security;
alter table attendance enable row level security;
