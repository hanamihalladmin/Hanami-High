drop policy if exists "members read own school form submissions" on public.school_form_submissions;
create policy "owner reads school form submissions"
on public.school_form_submissions for select
to authenticated
using (private.is_owner_discord_user());

create or replace function private.owner_student_portal_directory_internal()
returns table(character_id uuid, display_name text, handle text, visibility text, is_active boolean)
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if not private.is_owner_discord_user() then
    raise exception 'Owner access required';
  end if;
  return query
  select c.id,c.display_name,c.handle,c.visibility::text,c.is_active
  from public.characters c
  where c.role::text='student'
  order by lower(c.display_name), lower(c.handle);
end;
$$;

create or replace function public.owner_student_portal_directory()
returns table(character_id uuid, display_name text, handle text, visibility text, is_active boolean)
language sql
security invoker
set search_path=private
as $$ select * from private.owner_student_portal_directory_internal(); $$;

grant execute on function public.owner_student_portal_directory() to authenticated;

create or replace function private.owner_student_portal_snapshot_internal(target_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare result jsonb;
begin
  if not private.is_owner_discord_user() then
    raise exception 'Owner access required';
  end if;
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.role::text='student') then
    raise exception 'Student character not found';
  end if;

  select jsonb_build_object(
    'character',(select jsonb_build_object('id',c.id,'display_name',c.display_name,'handle',c.handle,'visibility',c.visibility::text,'is_active',c.is_active,'created_at',c.created_at) from public.characters c where c.id=target_character_id),
    'classes',coalesce((select jsonb_agg(jsonb_build_object('section_id',cs.id,'section_code',cs.section_code,'term',cs.term,'room',cs.room,'relationship',sm.relationship::text) order by cs.section_code) from public.section_memberships sm join public.class_sections cs on cs.id=sm.section_id where sm.character_id=target_character_id),'[]'::jsonb),
    'submissions',coalesce((select jsonb_agg(jsonb_build_object('assignment_id',s.assignment_id,'title',a.title,'status',s.status::text,'submitted_at',s.submitted_at,'grade',s.grade,'feedback',s.feedback) order by coalesce(s.submitted_at,s.created_at) desc) from public.assignment_submissions s join public.course_assignments a on a.id=s.assignment_id where s.student_character_id=target_character_id),'[]'::jsonb),
    'attendance',coalesce((select jsonb_agg(jsonb_build_object('date',ar.attendance_date,'status',ar.status,'note',ar.note,'section_code',cs.section_code) order by ar.attendance_date desc) from public.attendance_records ar left join public.class_sections cs on cs.id=ar.section_id where ar.student_character_id=target_character_id),'[]'::jsonb),
    'forms',coalesce((select jsonb_agg(jsonb_build_object('submission_id',s.id,'form_title',f.title,'status',s.status,'created_at',s.created_at,'response_data',s.response_data,'staff_notes',s.staff_notes) order by s.created_at desc) from public.school_form_submissions s left join public.school_forms f on f.id=s.form_id where s.submitted_by_character_id=target_character_id),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.owner_student_portal_snapshot(target_character_id uuid)
returns jsonb
language sql
security invoker
set search_path=private
as $$ select private.owner_student_portal_snapshot_internal(target_character_id); $$;

grant execute on function public.owner_student_portal_snapshot(uuid) to authenticated;
