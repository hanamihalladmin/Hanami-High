create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.school_calendar_events(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  response text not null default 'maybe' check (response in ('attending','maybe','not_attending')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,character_id)
);
alter table public.event_rsvps enable row level security;
drop policy if exists "characters read own event rsvps" on public.event_rsvps;
create policy "characters read own event rsvps" on public.event_rsvps for select to authenticated using (
  exists(select 1 from public.characters c where c.id=event_rsvps.character_id and c.owner_user_id=auth.uid())
  or private.can_manage_school_operations(auth.uid())
);
drop policy if exists "characters create own event rsvps" on public.event_rsvps;
create policy "characters create own event rsvps" on public.event_rsvps for insert to authenticated with check (
  exists(select 1 from public.characters c where c.id=event_rsvps.character_id and c.owner_user_id=auth.uid())
  and exists(select 1 from public.school_calendar_events e where e.id=event_rsvps.event_id and e.status='published'::school_event_status)
);
drop policy if exists "characters update own event rsvps" on public.event_rsvps;
create policy "characters update own event rsvps" on public.event_rsvps for update to authenticated using (
  exists(select 1 from public.characters c where c.id=event_rsvps.character_id and c.owner_user_id=auth.uid())
  or private.can_manage_school_operations(auth.uid())
) with check (
  exists(select 1 from public.characters c where c.id=event_rsvps.character_id and c.owner_user_id=auth.uid())
  or private.can_manage_school_operations(auth.uid())
);
drop policy if exists "characters delete own event rsvps" on public.event_rsvps;
create policy "characters delete own event rsvps" on public.event_rsvps for delete to authenticated using (
  exists(select 1 from public.characters c where c.id=event_rsvps.character_id and c.owner_user_id=auth.uid())
  or private.can_manage_school_operations(auth.uid())
);
grant select,insert,update,delete on public.event_rsvps to authenticated;

create table if not exists public.study_match_profiles (
  character_id uuid primary key references public.characters(id) on delete cascade,
  availability_text text not null default '',
  preferred_subjects text[] not null default '{}',
  is_matchable boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.study_match_profiles enable row level security;
drop policy if exists "students read matchable study profiles" on public.study_match_profiles;
create policy "students read matchable study profiles" on public.study_match_profiles for select to authenticated using (
  exists(select 1 from public.characters viewer where viewer.owner_user_id=auth.uid() and viewer.role='student'::character_role)
  and (is_matchable or exists(select 1 from public.characters own where own.id=study_match_profiles.character_id and own.owner_user_id=auth.uid()))
);
drop policy if exists "students manage own study profile" on public.study_match_profiles;
create policy "students manage own study profile" on public.study_match_profiles for all to authenticated using (
  exists(select 1 from public.characters c where c.id=study_match_profiles.character_id and c.owner_user_id=auth.uid() and c.role='student'::character_role)
) with check (
  exists(select 1 from public.characters c where c.id=study_match_profiles.character_id and c.owner_user_id=auth.uid() and c.role='student'::character_role)
);
grant select,insert,update,delete on public.study_match_profiles to authenticated;

create or replace function public.study_group_matches(viewer_character_id uuid)
returns table(group_id uuid,name text,subject text,meeting_location text,meeting_schedule text,member_count bigint,member_limit integer,shared_course boolean,match_score integer)
language sql
security invoker
set search_path=public,pg_temp
as $$
  with viewer as (
    select c.id from public.characters c
    where c.id=viewer_character_id and c.owner_user_id=auth.uid() and c.role='student'::character_role
  ), viewer_courses as (
    select distinct cs.course_id
    from public.section_memberships sm
    join public.class_sections cs on cs.id=sm.section_id
    join viewer v on v.id=sm.character_id
    where sm.relationship='student'
  ), prefs as (
    select coalesce(p.preferred_subjects,'{}'::text[]) subjects
    from viewer v left join public.study_match_profiles p on p.character_id=v.id
  )
  select g.id,g.name,g.subject,g.meeting_location,g.meeting_schedule,
         count(m.character_id)::bigint,g.member_limit,
         (g.course_id is not null and g.course_id in (select course_id from viewer_courses)) as shared_course,
         ((case when g.course_id is not null and g.course_id in (select course_id from viewer_courses) then 2 else 0 end)
          + (case when exists(select 1 from prefs, unnest(prefs.subjects) s where lower(s)=lower(g.subject)) then 1 else 0 end))::integer as match_score
  from public.study_groups g
  left join public.study_group_members m on m.group_id=g.id
  where exists(select 1 from viewer) and g.status='open'
  group by g.id,g.name,g.subject,g.meeting_location,g.meeting_schedule,g.member_limit,g.course_id
  having count(m.character_id) < g.member_limit
  order by match_score desc, g.created_at desc;
$$;
revoke all on function public.study_group_matches(uuid) from public,anon;
grant execute on function public.study_group_matches(uuid) to authenticated;
