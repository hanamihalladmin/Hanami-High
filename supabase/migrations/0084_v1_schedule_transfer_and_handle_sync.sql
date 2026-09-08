-- Transfer the approved V1 2006 school-day and homeroom schedules into V2.
-- Also repair published profile handle synchronization. The previous trigger
-- attempted to write an updated_at column that does not exist on
-- published_character_profiles, which could leave the published @handle stale.

create table if not exists public.school_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null,
  title text not null,
  weekday smallint not null check (weekday between 1 and 5),
  starts_at time not null,
  ends_at time not null,
  homeroom_label text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_schedule_blocks_time_check check (ends_at > starts_at)
);

create index if not exists school_schedule_blocks_weekday_idx
  on public.school_schedule_blocks(weekday, starts_at, sort_order);
create index if not exists school_schedule_blocks_homeroom_idx
  on public.school_schedule_blocks(homeroom_label, weekday, starts_at);

alter table public.school_schedule_blocks enable row level security;

drop policy if exists "authenticated read school schedule" on public.school_schedule_blocks;
create policy "authenticated read school schedule"
  on public.school_schedule_blocks for select
  to authenticated
  using (true);

grant select on public.school_schedule_blocks to authenticated;

-- This migration owns the canonical imported rows. Future owner schedule tools
-- can replace them deliberately; rerunning this migration remains deterministic.
delete from public.school_schedule_blocks
where notes in ('v1_schoolwide_schedule','v1_homeroom_schedule');

insert into public.school_schedule_blocks
  (block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
select v.block_type,v.title,d.weekday,v.starts_at::time,v.ends_at::time,'All Homerooms','v1_schoolwide_schedule',v.sort_order
from (values
  ('other','Arrival','08:30','08:35',1),
  ('other','Shoe Change','08:35','08:40',2),
  ('homeroom','Morning Homeroom (Asa-no-kai)','08:40','08:50',3),
  ('lunch','Lunch','12:40','13:25',20),
  ('other','Soji (Cleaning)','15:15','15:35',40),
  ('closing_advisory','Afternoon Homeroom (Kaeri-no-kai)','15:35','15:50',41),
  ('club','Bukatsu (Clubs / Extracurriculars)','16:00','18:30',50)
) as v(block_type,title,starts_at,ends_at,sort_order)
cross join (values (1::smallint),(2::smallint),(3::smallint),(4::smallint),(5::smallint)) d(weekday);

with period_times(period_no,starts_at,ends_at) as (
  values
    (1,'08:50'::time,'09:40'::time),
    (2,'09:50'::time,'10:40'::time),
    (3,'10:50'::time,'11:40'::time),
    (4,'11:50'::time,'12:40'::time),
    (5,'13:25'::time,'14:15'::time),
    (6,'14:25'::time,'15:15'::time)
), schedule(homeroom_code,weekday,courses) as (
  values
    ('A',1,array['MAT-101','HIS-101','SCI-101','CST-101','PE-101','STUDY']),
    ('A',2,array['HIS-101','SCI-101','ENG-101','MAT-101','MUS-118','ART-101']),
    ('A',3,array['SCI-101','MAT-101','STUDY','HIS-101','ENG-101','PE-101']),
    ('A',4,array['ENG-101','MUS-118','ART-101','SCI-101','MAT-101','HIS-101']),
    ('A',5,array['MUS-118','CST-101','MAT-101','ENG-101','HIS-101','SCI-101']),
    ('B',1,array['ENG-101','MAT-101','MUS-118','SCI-101','HIS-101','PE-101']),
    ('B',2,array['SCI-101','CST-101','HIS-101','ENG-101','MAT-101','MUS-118']),
    ('B',3,array['MAT-101','SCI-101','ENG-101','PE-101','HIS-101','STUDY']),
    ('B',4,array['CST-101','ENG-101','STUDY','HIS-101','SCI-101','MAT-101']),
    ('B',5,array['ART-101','MUS-118','ENG-101','SCI-101','MAT-101','HIS-101']),
    ('C',1,array['HIS-101','PE-101','MAT-101','SCI-101','ENG-101','MUS-118']),
    ('C',2,array['CST-101','SCI-101','MUS-118','ENG-101','HIS-101','MAT-101']),
    ('C',3,array['ENG-101','STUDY','SCI-101','PE-101','MAT-101','HIS-101']),
    ('C',4,array['MAT-101','ENG-101','HIS-101','CST-101','SCI-101','STUDY']),
    ('C',5,array['SCI-101','HIS-101','ENG-101','MAT-101','ART-101','MUS-118'])
), expanded as (
  select
    s.homeroom_code,
    s.weekday::smallint as weekday,
    u.ordinality::smallint as period_no,
    u.course_code
  from schedule s
  cross join lateral unnest(s.courses) with ordinality as u(course_code,ordinality)
)
insert into public.school_schedule_blocks
  (block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
select
  case when e.course_code='STUDY' then 'study' else 'class_period' end,
  case when e.course_code='STUDY' then 'Period '||e.period_no else e.course_code end,
  e.weekday,
  p.starts_at,
  p.ends_at,
  'Homeroom '||e.homeroom_code,
  'v1_homeroom_schedule',
  30+e.period_no
from expanded e
join period_times p using(period_no);

create or replace function private.sync_published_character_handle()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.handle is distinct from new.handle then
    update public.published_character_profiles
       set handle = new.handle::text
     where character_id = new.id;
  end if;
  return new;
end;
$$;

update public.published_character_profiles p
set handle = c.handle::text
from public.characters c
where c.id=p.character_id
  and p.handle is distinct from c.handle::text;
