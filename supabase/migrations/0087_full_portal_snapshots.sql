-- Snapshot RPCs for Guest, Student, Faculty, and Management portal surfaces.

create or replace function public.guest_public_snapshot()
returns jsonb
language sql
security definer
set search_path=''
as $$
 select jsonb_build_object(
  'announcements',coalesce((select jsonb_agg(x) from (
    select id,title,body,category,school_date
    from public.school_announcements
    where state='published'
    order by pinned desc,school_date desc nulls last,created_at desc
    limit 8
  ) x),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(x) from (
    select id,title,description,event_type,school_date,starts_at,ends_at,location
    from public.campus_events
    where status='published'
    order by school_date,starts_at
    limit 10
  ) x),'[]'::jsonb),
  'chronicle',coalesce((select jsonb_agg(x) from (
    select id,slug,title,dek,category,published_school_date,featured
    from public.chronicle_articles
    where state='published'
    order by featured desc,published_school_date desc nulls last,created_at desc
    limit 8
  ) x),'[]'::jsonb),
  'profiles',coalesce((select jsonb_agg(x) from (
    select character_id,display_name,handle,school_role,bio,custom_status,pronouns,avatar_path,banner_path
    from public.published_character_profiles
    where profile_visibility='public'
    order by published_at desc
    limit 12
  ) x),'[]'::jsonb),
  'boutique',coalesce((select jsonb_agg(x) from (
    select id,slug,name,description,item_type,collection_name,season,rarity,price_petals,pricing_state,is_animated
    from public.boutique_items
    where state='published'
    order by featured desc,is_new desc,created_at desc
    limit 16
  ) x),'[]'::jsonb),
  'radio',coalesce((select jsonb_agg(x) from (
    select id,title,description,show_name,school_date,starts_at
    from public.school_radio_posts
    where state='published'
    order by school_date desc nulls last,created_at desc
    limit 6
  ) x),'[]'::jsonb),
  'help',coalesce((select jsonb_agg(x) from (
    select slug,title,category,summary
    from public.help_articles
    where published
    order by sort_order,title
    limit 20
  ) x),'[]'::jsonb)
 );
$$;
revoke all on function public.guest_public_snapshot() from public;
grant execute on function public.guest_public_snapshot() to anon,authenticated;

create or replace function public.student_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_account uuid:=auth.uid();
 v_character uuid;
 result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 select active_character_id into v_character from public.accounts where id=v_account;
 if v_character is null then raise exception 'Choose an active character first'; end if;
 if not exists(select 1 from public.characters where id=v_character and account_id=v_account) then raise exception 'Active character unavailable'; end if;

 select jsonb_build_object(
  'planner',coalesce((select jsonb_agg(x) from (
    select id,title,details,item_kind,due_school_date,due_time,priority,completed,created_at
    from public.student_planner_items
    where character_id=v_character
    order by completed,due_school_date nulls last,due_time nulls last,created_at desc
    limit 40
  ) x),'[]'::jsonb),
  'mail',coalesce((select jsonb_agg(x) from (
    select id,category,subject,body,read_at,created_at
    from public.school_mail_messages
    where recipient_account_id=v_account
       or recipient_character_id=v_character
       or audience='school'
       or (audience='students' and exists(select 1 from public.characters c where c.id=v_character and c.school_role in ('student','new_student')))
       or (audience='faculty' and exists(select 1 from public.characters c where c.id=v_character and c.school_role='teacher'))
    order by created_at desc
    limit 30
  ) x),'[]'::jsonb),
  'assignments',coalesce((select jsonb_agg(x) from (
    select a.id,a.title,a.assignment_type,a.due_school_date,a.due_time,a.points_possible,s.id section_id,c.code course_code,c.name course_name
    from public.academic_assignments a
    join public.academic_sections s on s.id=a.section_id
    join public.academic_courses c on c.id=s.course_id
    join public.academic_enrollments e on e.section_id=s.id
    where e.student_character_id=v_character and e.status='enrolled' and a.state='published'
    order by a.due_school_date,a.due_time
    limit 20
  ) x),'[]'::jsonb),
  'grades',coalesce((select jsonb_agg(x) from (
    select g.assignment_id,a.title,g.points_earned,a.points_possible,g.feedback,g.graded_at
    from public.academic_grades g
    join public.academic_assignments a on a.id=g.assignment_id
    where g.student_character_id=v_character
    order by g.graded_at desc nulls last
    limit 20
  ) x),'[]'::jsonb),
  'attendance',coalesce((select jsonb_agg(x) from (
    select school_date,status,note
    from public.academic_attendance
    where student_character_id=v_character
    order by school_date desc
    limit 30
  ) x),'[]'::jsonb),
  'homeroom',(select to_jsonb(x) from (
    select h.id,h.code,h.room_label,h.description,m.student_year,advisor.display_name advisor_name
    from public.homeroom_memberships m
    join public.school_homerooms h on h.id=m.homeroom_id
    left join public.characters advisor on advisor.id=h.advisor_character_id
    where m.student_character_id=v_character
    limit 1
  ) x),
  'passport',coalesce((select jsonb_agg(x) from (
    select id,stamp_key,title,description,school_date,icon,category,awarded_at
    from public.character_passport_stamps
    where character_id=v_character
    order by coalesce(school_date,date '2006-01-01') desc,awarded_at desc
  ) x),'[]'::jsonb),
  'study_groups',coalesce((select jsonb_agg(x) from (
    select g.id,g.title,g.description,g.subject,g.next_session_at,g.owner_character_id
    from public.study_groups g
    where g.owner_character_id=v_character
       or exists(select 1 from public.study_group_members m where m.group_id=g.id and m.character_id=v_character)
    order by g.updated_at desc
  ) x),'[]'::jsonb),
  'yearbook',(select to_jsonb(y) from (
    select id,school_year,quote,activities,memory,photo_path,published
    from public.yearbook_entries
    where character_id=v_character and school_year=2006
    limit 1
  ) y),
  'bookmarks',coalesce((select jsonb_agg(x) from (
    select id,resource_type,resource_id,label,route_hash,created_at
    from public.global_bookmarks where account_id=v_account
    order by created_at desc limit 20
  ) x),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(x) from (
    select resource_type,resource_id,label,route_hash,viewed_at
    from public.recent_views where account_id=v_account
    order by viewed_at desc limit 12
  ) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.student_portal_snapshot() from public;
grant execute on function public.student_portal_snapshot() to authenticated;

create or replace function public.faculty_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_account uuid:=auth.uid();
 v_character uuid;
 v_role text;
 result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 select a.active_character_id,c.school_role into v_character,v_role
 from public.accounts a left join public.characters c on c.id=a.active_character_id
 where a.id=v_account;
 if v_character is null or v_role<>'teacher' then raise exception 'Faculty character required'; end if;

 select jsonb_build_object(
  'sections',coalesce((select jsonb_agg(x) from (
    select distinct s.id,s.section_code,c.code course_code,c.name course_name,s.room
    from public.academic_section_staff st
    join public.academic_sections s on s.id=st.section_id
    join public.academic_courses c on c.id=s.course_id
    where st.character_id=v_character and s.is_active
    order by s.section_code
  ) x),'[]'::jsonb),
  'assignments',coalesce((select jsonb_agg(x) from (
    select distinct a.id,a.section_id,a.title,a.assignment_type,a.state,a.due_school_date,a.due_time,a.points_possible
    from public.academic_assignments a
    join public.academic_section_staff st on st.section_id=a.section_id
    where st.character_id=v_character
    order by a.due_school_date desc nulls last
    limit 40
  ) x),'[]'::jsonb),
  'office_hours',coalesce((select jsonb_agg(x) from (
    select * from public.faculty_office_hours where faculty_character_id=v_character order by weekday,starts_at
  ) x),'[]'::jsonb),
  'lesson_plans',coalesce((select jsonb_agg(x) from (
    select * from public.faculty_lesson_plans where faculty_character_id=v_character order by school_date desc limit 30
  ) x),'[]'::jsonb),
  'templates',coalesce((select jsonb_agg(x) from (
    select * from public.faculty_assignment_templates where faculty_character_id=v_character order by updated_at desc
  ) x),'[]'::jsonb),
  'ungraded_count',(select count(*) from public.academic_submissions sub
    join public.academic_assignments a on a.id=sub.assignment_id
    join public.academic_section_staff st on st.section_id=a.section_id and st.character_id=v_character
    left join public.academic_grades g on g.assignment_id=a.id and g.student_character_id=sub.student_character_id
    where g.assignment_id is null),
  'advisor_homeroom',(select to_jsonb(x) from (
    select id,code,room_label,description from public.school_homerooms
    where advisor_character_id=v_character and is_active limit 1
  ) x)
 ) into result;
 return result;
end $$;
revoke all on function public.faculty_portal_snapshot() from public;
grant execute on function public.faculty_portal_snapshot() to authenticated;

create or replace function public.management_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_account uuid:=auth.uid(); result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 if not (public.has_capability('school.configure') or public.has_capability('moderation.review_reports') or public.has_capability('system.configure')) then
  raise exception 'Management access required';
 end if;
 select jsonb_build_object(
  'applications',case when public.has_capability('school.configure') or public.has_capability('characters.review') then coalesce((select jsonb_agg(x) from (
    select character_id,applicant_account_id,status,school_year,nickname,submitted_at,reviewed_at,accepted_at
    from public.student_applications order by created_at desc limit 60
  ) x),'[]'::jsonb) else '[]'::jsonb end,
  'feature_flags',case when public.has_capability('system.configure') then coalesce((select jsonb_agg(x) from (
    select * from public.school_feature_flags order by flag_key
  ) x),'[]'::jsonb) else '[]'::jsonb end,
  'seasonal_events',case when public.has_capability('school.configure') then coalesce((select jsonb_agg(x) from (
    select * from public.seasonal_event_configs order by starts_school_date desc
  ) x),'[]'::jsonb) else '[]'::jsonb end,
  'moderation_reports',case when public.has_capability('moderation.review_reports') then coalesce((select jsonb_agg(x) from (
    select id,reporter_character_id,target_character_id,target_type,target_id,reason,details,status,resolution_note,created_at,updated_at
    from public.moderation_reports order by created_at desc limit 50
  ) x),'[]'::jsonb) else '[]'::jsonb end,
  'suggestions',case when public.has_capability('school.configure') then coalesce((select jsonb_agg(x) from (
    select id,category,subject,body,anonymous_to_community,state,created_at
    from public.campus_suggestions order by created_at desc limit 50
  ) x),'[]'::jsonb) else '[]'::jsonb end,
  'stats',jsonb_build_object(
    'accounts',(select count(*) from public.accounts where account_state='active'),
    'characters',(select count(*) from public.characters where character_state='active'),
    'students',(select count(*) from public.characters where character_state='active' and school_role in ('student','new_student')),
    'faculty',(select count(*) from public.characters where character_state='active' and school_role='teacher'),
    'published_events',(select count(*) from public.campus_events where status='published'),
    'published_boutique_items',(select count(*) from public.boutique_items where state='published')
  )
 ) into result;
 return result;
end $$;
revoke all on function public.management_portal_snapshot() from public;
grant execute on function public.management_portal_snapshot() to authenticated;
