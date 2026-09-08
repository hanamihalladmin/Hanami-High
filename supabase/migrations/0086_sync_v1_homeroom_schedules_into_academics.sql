-- Materialize the transferred V1 weekly homeroom timetable into V2 academic
-- sections/meetings so existing My Schedule and My Homeroom views use the
-- approved timetable instead of showing empty periods.

insert into public.academic_sections
  (course_id,section_code,school_year,term,room,homeroom_code,capacity,is_active)
select distinct
  c.id,
  'HR-'||h.code||'-'||replace(c.code,'-',''),
  2006,
  'full_year',
  case
    when c.code='ART-101' then 'ART'
    when c.code='MUS-118' then 'Music'
    else h.room_label
  end,
  h.code,
  30,
  true
from public.school_schedule_blocks b
join public.school_homerooms h
  on upper('Homeroom '||h.code)=upper(coalesce(b.homeroom_label,''))
join public.academic_courses c
  on c.code=case when b.block_type='study' then 'STUDY-101' else b.title end
where b.notes='v1_homeroom_schedule'
on conflict (school_year,term,section_code) do update set
  course_id=excluded.course_id,
  room=excluded.room,
  homeroom_code=excluded.homeroom_code,
  is_active=true,
  updated_at=now();

-- Rebuild only schedule-managed meetings, identified by their HR- section code.
delete from public.academic_meetings m
using public.academic_sections s
where m.section_id=s.id
  and s.section_code like 'HR-%';

insert into public.academic_meetings
  (section_id,weekday,period_no,starts_at,ends_at,room,meeting_kind)
select
  s.id,
  b.weekday,
  (b.sort_order-30)::smallint,
  b.starts_at,
  b.ends_at,
  s.room,
  case when b.block_type='study' then 'study' else 'class' end
from public.school_schedule_blocks b
join public.school_homerooms h
  on upper('Homeroom '||h.code)=upper(coalesce(b.homeroom_label,''))
join public.academic_courses c
  on c.code=case when b.block_type='study' then 'STUDY-101' else b.title end
join public.academic_sections s
  on s.course_id=c.id
 and s.homeroom_code=h.code
 and s.section_code='HR-'||h.code||'-'||replace(c.code,'-','')
where b.notes='v1_homeroom_schedule'
order by h.code,b.weekday,b.starts_at;

create or replace function private.sync_homeroom_academic_enrollments()
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  -- Remove only schedule-managed HR-* enrollments that no longer match the
  -- student's current homeroom. Manually managed non-HR sections are untouched.
  delete from public.academic_enrollments e
  using public.academic_sections s
  where e.section_id=s.id
    and s.section_code like 'HR-%'
    and not exists (
      select 1
      from public.homeroom_memberships hm
      join public.school_homerooms h on h.id=hm.homeroom_id
      where hm.student_character_id=e.student_character_id
        and h.code=s.homeroom_code
    );

  insert into public.academic_enrollments
    (section_id,student_character_id,status)
  select s.id,hm.student_character_id,'active'
  from public.homeroom_memberships hm
  join public.school_homerooms h on h.id=hm.homeroom_id
  join public.academic_sections s
    on s.homeroom_code=h.code
   and s.section_code like 'HR-'||h.code||'-%'
   and s.is_active
  on conflict(section_id,student_character_id) do update set
    status='active',
    updated_at=now();
end;
$$;

create or replace function private.sync_homeroom_academic_enrollments_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.sync_homeroom_academic_enrollments();
  return null;
end;
$$;

drop trigger if exists homeroom_memberships_sync_academic_enrollments on public.homeroom_memberships;
create trigger homeroom_memberships_sync_academic_enrollments
after insert or update or delete on public.homeroom_memberships
for each statement execute function private.sync_homeroom_academic_enrollments_trigger();

select private.sync_homeroom_academic_enrollments();
