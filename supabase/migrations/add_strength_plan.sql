-- Strength plan: saved routines and the planned sessions generated from them.
-- A confirmed session links to the Strength row it created in cross_training.

create table batchburn.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_minutes integer not null check (default_minutes between 1 and 600),
  kind text not null default 'session' check (kind in ('session', 'addon')),
  weekdays smallint[] not null default '{}',   -- ISO days, 1 = Monday. Empty = no default day
  addon_default boolean not null default false, -- for kind = addon: pre-ticked on new sessions
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table batchburn.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references batchburn.routines(id) on delete set null,
  routine_name text not null,                  -- snapshot, survives routine edits
  week_start date not null,                    -- Sunday of the week it was generated for
  slot_weekday smallint,                       -- weekday it was generated from; null for ad hoc
  date date not null,                          -- current planned or actual date (changes on move)
  minutes integer not null,
  addons jsonb not null default '[]',          -- [{ "name": "Stretch", "minutes": 10 }]
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  cross_training_id uuid references batchburn.cross_training(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, routine_id, week_start, slot_weekday)
);

alter table batchburn.routines enable row level security;
alter table batchburn.planned_sessions enable row level security;

create policy "users own routines" on batchburn.routines
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own planned sessions" on batchburn.planned_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on batchburn.routines, batchburn.planned_sessions to authenticated;
