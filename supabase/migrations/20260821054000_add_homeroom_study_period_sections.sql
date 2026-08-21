do $$
declare
  study_course_id uuid;
  section_a uuid;
  section_b uuid;
  section_c uuid;
begin
  insert into public.academic_courses(code,title,department,description,credits)
  values('STUDY-101','Study Period','Student Support','Supervised independent study period for homeroom students when no regular class is scheduled.',1)
  on conflict (code) do update set title=excluded.title,department=excluded.department,description=excluded.description,updated_at=now()
  returning id into study_course_id;

  insert into public.class_sections(course_id,section_code,term,room,capacity)
  values(study_course_id,'A','2006-2007','Study Hall A',15)
  on conflict (course_id,section_code,term) do update set room=excluded.room,capacity=excluded.capacity,updated_at=now()
  returning id into section_a;

  insert into public.class_sections(course_id,section_code,term,room,capacity)
  values(study_course_id,'B','2006-2007','Study Hall B',15)
  on conflict (course_id,section_code,term) do update set room=excluded.room,capacity=excluded.capacity,updated_at=now()
  returning id into section_b;

  insert into public.class_sections(course_id,section_code,term,room,capacity)
  values(study_course_id,'C','2006-2007','Study Hall C',15)
  on conflict (course_id,section_code,term) do update set room=excluded.room,capacity=excluded.capacity,updated_at=now()
  returning id into section_c;

  delete from public.section_meetings where section_id in (section_a,section_b,section_c);
  insert into public.section_meetings(section_id,weekday,starts_at,ends_at,label) values
    (section_a,5,'12:50','13:35','Study Period • Homeroom A'),
    (section_b,5,'13:35','14:20','Study Period • Homeroom B'),
    (section_c,2,'13:35','14:20','Study Period • Homeroom C');

  insert into public.section_memberships(section_id,character_id,relationship)
  select cs.id,hm.student_character_id,'student'
  from public.class_sections cs
  join public.homerooms h on upper(h.code)=upper(cs.section_code) and h.school_year=cs.term and h.is_active
  join public.homeroom_memberships hm on hm.homeroom_id=h.id
  where cs.course_id=study_course_id and cs.term='2006-2007'
  on conflict (section_id,character_id) do update set relationship='student';
end $$;
