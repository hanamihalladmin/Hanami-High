create or replace function public.staff_student_overview(target_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare result jsonb;
begin
 if not public.school_staff_can_manage() then raise exception 'staff access required'; end if;
 if not exists(select 1 from public.characters c where c.id=target_character_id and c.role='student') then raise exception 'student not found'; end if;
 select jsonb_build_object(
  'student',(select jsonb_build_object('id',c.id,'display_name',c.display_name,'handle',c.handle,'visibility',c.visibility,'is_active',c.is_active,'created_at',c.created_at) from public.characters c where c.id=target_character_id),
  'homeroom',coalesce((select jsonb_build_object('code',h.code,'room_label',h.room_label,'student_year',hm.student_year,'adviser_character_id',h.adviser_character_id) from public.homeroom_memberships hm join public.homerooms h on h.id=hm.homeroom_id where hm.student_character_id=target_character_id limit 1),'{}'::jsonb),
  'school_id',coalesce((select jsonb_build_object('school_number',s.school_number,'status',s.status,'expires_at',s.expires_at) from public.character_school_ids s where s.character_id=target_character_id limit 1),'{}'::jsonb),
  'courses',coalesce((select jsonb_agg(jsonb_build_object('section_id',cs.id,'section_code',cs.section_code,'room',cs.room,'course_code',ac.code,'course_title',ac.title) order by ac.title) from public.section_memberships sm join public.class_sections cs on cs.id=sm.section_id join public.academic_courses ac on ac.id=cs.course_id where sm.character_id=target_character_id and sm.relationship='student'),'[]'::jsonb),
  'attendance',coalesce((select jsonb_agg(jsonb_build_object('attendance_date',ar.attendance_date,'status',ar.status,'note',ar.note,'section_id',ar.section_id) order by ar.attendance_date desc) from (select * from public.attendance_records where student_character_id=target_character_id order by attendance_date desc limit 40) ar),'[]'::jsonb),
  'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',a.title,'status',s.status,'grade',s.grade,'points',a.points,'submitted_at',s.submitted_at,'due_at',a.due_at,'section_id',a.section_id) order by coalesce(s.submitted_at,s.created_at) desc) from public.assignment_submissions s join public.course_assignments a on a.id=s.assignment_id where s.student_character_id=target_character_id),'[]'::jsonb),
  'conduct',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'case_type',x.case_type,'title',x.title,'status',x.status,'resolution',x.resolution,'private_notes',x.private_notes,'created_at',x.created_at) order by x.created_at desc) from public.student_conduct_cases x where x.student_character_id=target_character_id),'[]'::jsonb),
  'commendations',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'category',x.category,'title',x.title,'note',x.note,'points',x.points,'issued_at',x.issued_at) order by x.issued_at desc) from public.student_commendations x where x.student_character_id=target_character_id),'[]'::jsonb),
  'activities',coalesce((select jsonb_agg(jsonb_build_object('name',a.name,'kind',a.kind,'status',m.status,'joined_at',m.joined_at) order by a.name) from public.campus_activity_memberships m join public.campus_activities a on a.id=m.activity_id where m.character_id=target_character_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.staff_student_overview(uuid) from public;
grant execute on function public.staff_student_overview(uuid) to authenticated;
