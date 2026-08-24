alter table public.section_memberships
  add column if not exists enrollment_source text not null default 'manual';

create table if not exists public.course_assignment_homerooms (
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  homeroom_id uuid not null references public.homerooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (assignment_id, homeroom_id)
);

alter table public.course_assignment_homerooms enable row level security;

create policy "instructors read assignment homeroom targets"
on public.course_assignment_homerooms for select
to authenticated
using (exists (select 1 from public.course_assignments ca where ca.id=assignment_id and private.current_user_instructs_section(ca.section_id)));

create policy "instructors create assignment homeroom targets"
on public.course_assignment_homerooms for insert
to authenticated
with check (exists (select 1 from public.course_assignments ca where ca.id=assignment_id and private.current_user_instructs_section(ca.section_id)));

create policy "instructors delete assignment homeroom targets"
on public.course_assignment_homerooms for delete
to authenticated
using (exists (select 1 from public.course_assignments ca where ca.id=assignment_id and private.current_user_instructs_section(ca.section_id)));

create policy "students read own assignment homeroom targets"
on public.course_assignment_homerooms for select
to authenticated
using (exists (
  select 1 from public.homeroom_memberships hm
  join public.characters c on c.id=hm.student_character_id
  where hm.homeroom_id=course_assignment_homerooms.homeroom_id and c.owner_user_id=auth.uid()
));

drop policy if exists "students read published assignments for own classes" on public.course_assignments;
create policy "students read published assignments for scheduled homeroom courses"
on public.course_assignments for select
to authenticated
using (
  status=any(array['published'::public.assignment_status,'closed'::public.assignment_status])
  and exists (
    select 1 from public.section_memberships sm
    join public.characters c on c.id=sm.character_id
    where sm.section_id=course_assignments.section_id
      and sm.relationship='student'::public.section_relationship
      and c.owner_user_id=auth.uid()
  )
  and exists (
    select 1 from public.course_assignment_homerooms cah
    join public.homeroom_memberships hm on hm.homeroom_id=cah.homeroom_id
    join public.characters c2 on c2.id=hm.student_character_id
    where cah.assignment_id=course_assignments.id and c2.owner_user_id=auth.uid()
  )
);

create or replace function private.sync_homeroom_schedule_enrollments()
returns void
language plpgsql
security definer
set search_path=public,private
as $$
begin
  delete from public.section_memberships sm
  where sm.relationship='student'::public.section_relationship
    and sm.enrollment_source='homeroom_schedule'
    and not exists (
      select 1
      from public.homeroom_memberships hm
      join public.homerooms h on h.id=hm.homeroom_id
      join public.school_schedule_blocks b
        on b.notes='owner_homeroom_daily_schedule'
       and b.block_type='class_period'
       and upper(regexp_replace(coalesce(b.homeroom_label,''),'^Homeroom\s+','','i'))=upper(h.code)
      join public.academic_courses ac on upper(ac.code)=upper(b.title)
      join public.class_sections cs on cs.course_id=ac.id
      where hm.student_character_id=sm.character_id and cs.id=sm.section_id
    );

  insert into public.section_memberships(section_id,character_id,relationship,enrollment_source)
  select distinct cs.id,hm.student_character_id,'student'::public.section_relationship,'homeroom_schedule'
  from public.homeroom_memberships hm
  join public.homerooms h on h.id=hm.homeroom_id
  join public.school_schedule_blocks b
    on b.notes='owner_homeroom_daily_schedule'
   and b.block_type='class_period'
   and upper(regexp_replace(coalesce(b.homeroom_label,''),'^Homeroom\s+','','i'))=upper(h.code)
  join public.academic_courses ac on upper(ac.code)=upper(b.title)
  join public.class_sections cs on cs.course_id=ac.id
  on conflict (section_id,character_id) do update
    set relationship=excluded.relationship,
        enrollment_source=case when public.section_memberships.enrollment_source='manual' then public.section_memberships.enrollment_source else excluded.enrollment_source end;
end;
$$;

create or replace function private.sync_homeroom_schedule_enrollments_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  perform private.sync_homeroom_schedule_enrollments();
  return null;
end;
$$;

drop trigger if exists sync_homeroom_schedule_enrollments_after_change on public.school_schedule_blocks;
create trigger sync_homeroom_schedule_enrollments_after_change
after insert or update or delete on public.school_schedule_blocks
for each statement execute function private.sync_homeroom_schedule_enrollments_trigger();

select private.sync_homeroom_schedule_enrollments();
