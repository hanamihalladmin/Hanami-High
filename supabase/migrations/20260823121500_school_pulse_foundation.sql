create table if not exists public.school_state_config (
  id smallint primary key default 1 check (id = 1),
  term text not null default 'Spring Term',
  day_type text not null default 'normal' check (day_type in ('normal','shortened','exam','festival_prep','event','assembly','field_trip','sports')),
  closure_state text not null default 'open' check (closure_state in ('open','delayed','early_dismissal','closed','event_only')),
  exam_week boolean not null default false,
  festival_mode boolean not null default false,
  election_mode boolean not null default false,
  seasonal_state text not null default 'spring',
  rp_focus text not null default '',
  status_message text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.school_state_config(id) values (1) on conflict (id) do nothing;
alter table public.school_state_config enable row level security;
drop policy if exists school_state_read on public.school_state_config;
create policy school_state_read on public.school_state_config for select using (auth.uid() is not null);
drop policy if exists school_state_staff_manage on public.school_state_config;
create policy school_state_staff_manage on public.school_state_config for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

create table if not exists public.school_state_transitions (
  id uuid primary key default gen_random_uuid(),
  effective_at timestamptz not null,
  day_type text,
  closure_state text,
  exam_week boolean,
  festival_mode boolean,
  election_mode boolean,
  seasonal_state text,
  rp_focus text,
  status_message text,
  applied_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists school_state_transitions_effective_idx on public.school_state_transitions(effective_at,applied_at);
alter table public.school_state_transitions enable row level security;
drop policy if exists school_state_transition_read on public.school_state_transitions;
create policy school_state_transition_read on public.school_state_transitions for select using (auth.uid() is not null);
drop policy if exists school_state_transition_staff_manage on public.school_state_transitions;
create policy school_state_transition_staff_manage on public.school_state_transitions for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());