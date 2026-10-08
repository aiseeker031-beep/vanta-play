create table if not exists public.location_visits (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  city text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_location_visits_created on public.location_visits (created_at desc);
alter table public.location_visits enable row level security;
-- No anon policies: only service-role (edge functions) can read/write.