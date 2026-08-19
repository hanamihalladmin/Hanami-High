alter table public.course_assignments drop constraint if exists course_assignments_late_policy_check;
alter table public.course_assignments drop constraint if exists course_assignments_late_policy_length_check;
alter table public.course_assignments add constraint course_assignments_late_policy_length_check check (late_policy is null or char_length(late_policy) <= 500);

create or replace function private.student_class_detail_internal(viewer_character_id uuid,target_section_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare result jsonb;
begin
  if not private.user_owns_character(viewer_character_id) then
    raise exception 'Student character is not owned by the signed-in account.';
  end if;
  if not exists(select 1 from public.characters c where c.id=viewer_character_id and c.role='student') then
    raise exception 'Student character required.';
  end if;
  if not exists(select 1 from public.section_memberships sm where sm.section_id=target_section_id and sm.character_id=viewer_character_id and sm.relationship='student') then
    raise exception 'Student is not enrolled in this class section.';
  end if;

  select jsonb_build_object(
    'section',jsonb_build_object('id',cs.id,'section_code',cs.section_code,'term',cs.term,'room',cs.room,'is_test_data',cs.is_test_data,'course',jsonb_build_object('code',ac.code,'title',ac.title,'department',ac.department,'description',ac.description,'credits',ac.credits,'is_test_data',ac.is_test_data)),
    'instructors',coalesce((select jsonb_agg(jsonb_build_object('display_name',c.display_name,'handle',c.handle) order by c.display_name) from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=cs.id and sm.relationship='instructor'),'[]'::jsonb),
    'meetings',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'weekday',m.weekday,'starts_at',m.starts_at,'ends_at',m.ends_at,'label',m.label) order by m.weekday,m.starts_at) from public.section_meetings m where m.section_id=cs.id),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'description',a.description,'due_at',a.due_at,'points',a.points,'status',a.status,'assessment_type',a.assessment_type,'assignment_group',a.assignment_group,'late_policy',a.late_policy,'is_test_data',a.is_test_data,'submission',case when s.id is null then null else jsonb_build_object('id',s.id,'status',s.status,'submitted_at',s.submitted_at,'grade',s.grade,'feedback',s.feedback,'body',s.body) end) order by a.due_at nulls last,a.created_at) from public.course_assignments a left join public.assignment_submissions s on s.assignment_id=a.id and s.student_character_id=viewer_character_id where a.section_id=cs.id and a.status in ('published','closed')),'[]'::jsonb),
    'attendance',coalesce((select jsonb_agg(jsonb_build_object('id',ar.id,'attendance_date',ar.attendance_date,'status',ar.status,'note',ar.note) order by ar.attendance_date desc) from public.attendance_records ar where ar.section_id=cs.id and ar.student_character_id=viewer_character_id),'[]'::jsonb)
  ) into result
  from public.class_sections cs join public.academic_courses ac on ac.id=cs.course_id
  where cs.id=target_section_id;
  return result;
end;
$$;
revoke all on function private.student_class_detail_internal(uuid,uuid) from public,anon;
grant execute on function private.student_class_detail_internal(uuid,uuid) to authenticated;

create or replace function public.student_class_detail(viewer_character_id uuid,target_section_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path=private
as $$ select private.student_class_detail_internal(viewer_character_id,target_section_id); $$;
revoke all on function public.student_class_detail(uuid,uuid) from public,anon;
grant execute on function public.student_class_detail(uuid,uuid) to authenticated;
