create or replace function private.roadmap_student_directory_internal()
returns table(character_id uuid,display_name text,handle text,grade_level smallint,homeroom_code text)
language sql
security definer
set search_path=public,private,pg_temp
as $$
  select c.id,c.display_name,c.handle,h.grade_level,h.code
  from public.characters c
  left join public.homeroom_memberships hm on hm.student_character_id=c.id
  left join public.homerooms h on h.id=hm.homeroom_id and h.is_active
  where c.role='student'::character_role
    and (
      private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission)
      or private.account_has_permission(auth.uid(),'content_editor'::hanami_account_permission)
      or private.account_has_permission(auth.uid(),'moderator'::hanami_account_permission)
      or private.is_owner_discord_user()
    )
  order by coalesce(h.grade_level,0) desc,c.display_name;
$$;
revoke all on function private.roadmap_student_directory_internal() from public,anon;
grant execute on function private.roadmap_student_directory_internal() to authenticated;
create or replace function public.roadmap_student_directory()
returns table(character_id uuid,display_name text,handle text,grade_level smallint,homeroom_code text)
language sql security invoker set search_path=public,private,pg_temp
as $$ select * from private.roadmap_student_directory_internal(); $$;
revoke all on function public.roadmap_student_directory() from public,anon;
grant execute on function public.roadmap_student_directory() to authenticated;

create or replace function private.roadmap_event_rsvp_summary_internal()
returns table(event_id uuid,title text,attending bigint,maybe bigint,not_attending bigint)
language sql security definer set search_path=public,private,pg_temp
as $$
  select e.id,e.title,
    count(*) filter(where r.response='attending')::bigint,
    count(*) filter(where r.response='maybe')::bigint,
    count(*) filter(where r.response='not_attending')::bigint
  from public.school_calendar_events e
  left join public.event_rsvps r on r.event_id=e.id
  where e.status='published'::school_event_status
    and private.can_manage_school_operations(auth.uid())
  group by e.id,e.title
  order by min(e.starts_at) desc;
$$;
revoke all on function private.roadmap_event_rsvp_summary_internal() from public,anon;
grant execute on function private.roadmap_event_rsvp_summary_internal() to authenticated;
create or replace function public.roadmap_event_rsvp_summary()
returns table(event_id uuid,title text,attending bigint,maybe bigint,not_attending bigint)
language sql security invoker set search_path=public,private,pg_temp
as $$ select * from private.roadmap_event_rsvp_summary_internal(); $$;
revoke all on function public.roadmap_event_rsvp_summary() from public,anon;
grant execute on function public.roadmap_event_rsvp_summary() to authenticated;
