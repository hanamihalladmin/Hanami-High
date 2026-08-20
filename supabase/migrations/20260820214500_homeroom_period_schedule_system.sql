create table if not exists public.school_homerooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 2 and 80),
  school_year text not null default '2006-2007',
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_periods (
  id uuid primary key default gen_random_uuid(),
  period_number smallint not null unique check (period_number between 1 and 20),
  label text not null check (char_length(label) between 2 and 60),
  starts_at time not null,
  ends_at time not null,
  is_instructional boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.school_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  homeroom_id uuid not null references public.school_homerooms(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  period_id uuid not null references public.school_periods(id) on delete restrict,
  section_id uuid references public.class_sections(id) on delete cascade,
  activity_title text,
  instructor_character_id uuid references public.characters(id) on delete set null,
  room text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (section_id is not null or nullif(btrim(activity_title),'') is not null),
  unique (homeroom_id, weekday, period_id)
);

create unique index if not exists school_schedule_teacher_conflict_idx
  on public.school_schedule_assignments(instructor_character_id, weekday, period_id)
  where instructor_character_id is not null;

create unique index if not exists school_schedule_room_conflict_idx
  on public.school_schedule_assignments(lower(btrim(room)), weekday, period_id)
  where nullif(btrim(room),'') is not null;

create index if not exists school_schedule_homeroom_weekday_idx
  on public.school_schedule_assignments(homeroom_id, weekday, period_id);
create index if not exists school_schedule_section_idx
  on public.school_schedule_assignments(section_id);

alter table public.school_homerooms enable row level security;
alter table public.school_periods enable row level security;
alter table public.school_schedule_assignments enable row level security;

grant select on public.school_homerooms to authenticated;
grant select on public.school_periods to authenticated;
grant select on public.school_schedule_assignments to authenticated;
grant insert, update, delete on public.school_homerooms to authenticated;
grant insert, update, delete on public.school_periods to authenticated;
grant insert, update, delete on public.school_schedule_assignments to authenticated;

create policy "members read active homerooms"
on public.school_homerooms for select to authenticated
using (is_active or private.account_has_permission('site_admin'));

create policy "site admins manage homerooms"
on public.school_homerooms for all to authenticated
using (private.account_has_permission('site_admin'))
with check (private.account_has_permission('site_admin'));

create policy "members read active school periods"
on public.school_periods for select to authenticated
using (is_active or private.account_has_permission('site_admin'));

create policy "site admins manage school periods"
on public.school_periods for all to authenticated
using (private.account_has_permission('site_admin'))
with check (private.account_has_permission('site_admin'));

create policy "members read school schedule assignments"
on public.school_schedule_assignments for select to authenticated
using (true);

create policy "site admins manage school schedule assignments"
on public.school_schedule_assignments for all to authenticated
using (private.account_has_permission('site_admin'))
with check (private.account_has_permission('site_admin'));

create or replace function private.validate_school_schedule_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.instructor_character_id is not null and not exists (
    select 1 from public.characters c
    where c.id = new.instructor_character_id and c.role = 'faculty'
  ) then
    raise exception 'schedule instructor must be a faculty character';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_school_schedule_assignment() from public, anon, authenticated;

drop trigger if exists validate_school_schedule_assignment_trigger on public.school_schedule_assignments;
create trigger validate_school_schedule_assignment_trigger
before insert or update on public.school_schedule_assignments
for each row execute function private.validate_school_schedule_assignment();

insert into public.school_homerooms(code,name,school_year,sort_order)
values
  ('A','Homeroom A','2006-2007',1),
  ('B','Homeroom B','2006-2007',2),
  ('C','Homeroom C','2006-2007',3)
on conflict (code) do nothing;

insert into public.school_periods(period_number,label,starts_at,ends_at,is_instructional)
values
  (1,'Period 1','08:30','09:20',true),
  (2,'Period 2','09:30','10:20',true),
  (3,'Period 3','10:30','11:20',true),
  (4,'Period 4','11:30','12:20',true),
  (5,'Period 5','13:10','14:00',true),
  (6,'Period 6','14:10','15:00',true)
on conflict (period_number) do nothing;
