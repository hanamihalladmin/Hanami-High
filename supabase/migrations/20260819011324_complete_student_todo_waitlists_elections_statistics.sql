alter table public.course_assignments add column if not exists assessment_type text not null default 'assignment' check (assessment_type in ('assignment','quiz','exam','project','presentation','other'));

drop policy if exists "students join own waitlist" on public.section_waitlist_entries;
create policy "students join full section waitlist" on public.section_waitlist_entries for insert to authenticated with check (
  status='waiting'
  and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student')
  and not exists(select 1 from public.section_memberships sm where sm.section_id=section_id and sm.character_id=student_character_id)
  and exists(
    select 1 from public.class_sections s
    where s.id=section_id
      and (select count(*) from public.section_memberships sm where sm.section_id=s.id and sm.relationship='student') >= s.capacity
  )
);

create or replace function private.enroll_waitlisted_student() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
declare cap integer; enrolled integer;
begin
  if new.status='enrolled' and old.status is distinct from 'enrolled' then
    if not private.can_manage_school_operations(auth.uid()) then raise exception 'Only school operations staff may enroll from a waitlist'; end if;
    select capacity into cap from public.class_sections where id=new.section_id for update;
    select count(*) into enrolled from public.section_memberships where section_id=new.section_id and relationship='student';
    if enrolled>=cap then raise exception 'Section is still full'; end if;
    insert into public.section_memberships(section_id,character_id,relationship)
    values(new.section_id,new.student_character_id,'student')
    on conflict do nothing;
    new.resolved_at=coalesce(new.resolved_at,now());
  elsif new.status in ('declined','removed') and old.status is distinct from new.status then
    new.resolved_at=coalesce(new.resolved_at,now());
  elsif new.status='offered' and old.status is distinct from 'offered' then
    new.offered_at=coalesce(new.offered_at,now());
  end if;
  return new;
end;$$;
drop trigger if exists trg_enroll_waitlisted_student on public.section_waitlist_entries;
create trigger trg_enroll_waitlisted_student before update on public.section_waitlist_entries for each row execute function private.enroll_waitlisted_student();

create or replace function public.current_waitlist(target_character_id uuid)
returns table(entry_id uuid,section_id uuid,section_code text,course_title text,waitlist_position bigint,entry_status text,created_at timestamptz)
language sql stable security definer set search_path=public,private,auth as $$
  select q.id,q.section_id,q.section_code,q.course_title,q.waitlist_position,q.status,q.created_at
  from (
    select w.id,w.section_id,s.section_code,c.title as course_title,w.status,w.created_at,w.student_character_id,
      row_number() over(partition by w.section_id order by w.created_at,w.position)::bigint as waitlist_position
    from public.section_waitlist_entries w
    join public.class_sections s on s.id=w.section_id
    join public.academic_courses c on c.id=s.course_id
    where w.status in ('waiting','offered','enrolled')
  ) q
  join public.characters ch on ch.id=q.student_character_id and ch.owner_user_id=auth.uid()
  where q.student_character_id=target_character_id
  order by q.created_at;
$$;

create or replace function public.student_todo_feed(target_character_id uuid)
returns table(item_type text,title text,due_at timestamptz,priority text,source_id text)
language plpgsql stable security definer set search_path=public,private,auth as $$
declare unread_total bigint;
begin
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='student') then return; end if;

  return query
  select
    case
      when a.assessment_type='exam' and a.due_at>=now() then 'upcoming_exam'
      when a.due_at<now() then 'missing_work'
      when (a.due_at at time zone 'Asia/Tokyo')::date=(now() at time zone 'Asia/Tokyo')::date then 'due_today'
      else 'due_this_week'
    end::text,
    a.title,a.due_at,
    case when a.due_at<now() then 'urgent' when a.due_at<now()+interval '1 day' then 'high' else 'normal' end::text,
    a.id::text
  from public.course_assignments a
  join public.section_memberships sm on sm.section_id=a.section_id and sm.character_id=target_character_id and sm.relationship='student'
  left join public.assignment_submissions s on s.assignment_id=a.id and s.student_character_id=target_character_id
  where a.status='published' and a.due_at is not null and (s.id is null or s.status in ('draft','returned')) and a.due_at<now()+interval '7 days'

  union all
  select 'office_response'::text,'School Office response needed'::text,r.updated_at,'high'::text,r.id::text
  from public.school_office_requests r where r.character_id=target_character_id and r.status='waiting_on_member'

  union all
  select 'academic_alert'::text,aa.title,aa.created_at,
    case when aa.severity='urgent' then 'urgent' when aa.severity='warning' then 'high' else 'normal' end::text,aa.id::text
  from public.academic_alerts aa where aa.student_character_id=target_character_id and not aa.is_resolved

  union all
  select 'unread_messages'::text,(count(m.id)::text || ' unread message' || case when count(m.id)=1 then '' else 's' end),max(m.created_at),'normal'::text,cp.conversation_id::text
  from public.conversation_participants cp
  join public.conversation_messages m on m.conversation_id=cp.conversation_id and m.created_at>coalesce(cp.last_read_at,cp.joined_at) and m.sender_character_id<>target_character_id
  where cp.character_id=target_character_id
  group by cp.conversation_id
  having count(m.id)>0

  order by due_at nulls last;
end;$$;

drop policy if exists "students nominate own character" on public.election_nominations;
create policy "students nominate own character during nomination window" on public.election_nominations for insert to authenticated with check (
  status='submitted'
  and exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid() and c.role='student')
  and exists(
    select 1 from public.election_positions p join public.school_elections e on e.id=p.election_id
    where p.id=position_id and e.status='nominations'
      and (e.nominations_open_at is null or e.nominations_open_at<=now())
      and (e.nominations_close_at is null or e.nominations_close_at>=now())
  )
);

drop function if exists public.school_statistics_dashboard();
create function public.school_statistics_dashboard()
returns table(student_characters bigint,faculty_characters bigint,active_characters bigint,course_enrollments bigint,organization_memberships bigint,open_reports bigint,open_office_requests bigint,open_support_tickets bigint,storage_bytes bigint)
language plpgsql stable security definer set search_path=public,private,auth,storage as $$
begin
  if not (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator')) then raise exception 'Not authorized'; end if;
  return query select
    (select count(*) from public.characters where role='student'),
    (select count(*) from public.characters where role='faculty'),
    (select count(*) from public.characters where is_active),
    (select count(*) from public.section_memberships where relationship='student'),
    (select count(*) from public.campus_activity_memberships where status='active'),
    (select count(*) from public.character_reports where status in ('submitted','reviewing')),
    (select count(*) from public.school_office_requests where status not in ('resolved','closed')),
    (select count(*) from public.support_tickets where status not in ('resolved','closed')),
    coalesce((select sum(coalesce((metadata->>'size')::bigint,0)) from storage.objects),0)::bigint;
end;$$;
revoke all on function public.school_statistics_dashboard() from public,anon;
grant execute on function public.school_statistics_dashboard() to authenticated;
