create table if not exists public.section_grade_categories(
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.class_sections(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 60),
 weight_percent numeric(5,2) not null check(weight_percent>=0 and weight_percent<=100),
 created_at timestamptz not null default now(),
 unique(section_id,name)
);
alter table public.section_grade_categories enable row level security;
grant select,insert,update,delete on public.section_grade_categories to authenticated;
create policy "section members read grade categories" on public.section_grade_categories for select to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=section_grade_categories.section_id and c.owner_user_id=auth.uid()));
create policy "instructors manage grade categories" on public.section_grade_categories for all to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=section_grade_categories.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid())) with check(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=section_grade_categories.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()));

alter table public.course_assignments add column if not exists grade_category_id uuid references public.section_grade_categories(id) on delete set null;
alter table public.course_assignments add column if not exists assignment_group text not null default 'coursework';
alter table public.course_assignments add column if not exists late_policy text not null default 'teacher_discretion' check(late_policy in ('not_accepted','teacher_discretion','accepted'));

create table if not exists public.attendance_records(
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.class_sections(id) on delete cascade,
 student_character_id uuid not null references public.characters(id) on delete cascade,
 attendance_date date not null,
 status text not null check(status in ('present','absent','tardy','excused')),
 note text,
 marked_by_character_id uuid references public.characters(id) on delete set null,
 marked_at timestamptz not null default now(),
 unique(section_id,student_character_id,attendance_date)
);
alter table public.attendance_records enable row level security;
grant select,insert,update on public.attendance_records to authenticated;
revoke delete on public.attendance_records from authenticated;
create policy "students read own attendance" on public.attendance_records for select to authenticated using(private.user_owns_character(student_character_id));
create policy "instructors read section attendance" on public.attendance_records for select to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=attendance_records.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()));
create policy "instructors create section attendance" on public.attendance_records for insert to authenticated with check(private.user_owns_character(marked_by_character_id) and exists(select 1 from public.section_memberships sm where sm.section_id=attendance_records.section_id and sm.character_id=attendance_records.marked_by_character_id and sm.relationship='instructor') and exists(select 1 from public.section_memberships student where student.section_id=attendance_records.section_id and student.character_id=attendance_records.student_character_id and student.relationship='student'));
create policy "instructors update section attendance" on public.attendance_records for update to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=attendance_records.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid())) with check(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=attendance_records.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()));

create table if not exists public.student_report_cards(
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.class_sections(id) on delete cascade,
 student_character_id uuid not null references public.characters(id) on delete cascade,
 term text not null,
 numeric_grade numeric(5,2) check(numeric_grade>=0 and numeric_grade<=100),
 letter_grade text check(letter_grade is null or char_length(letter_grade)<=4),
 instructor_comment text,
 status text not null default 'draft' check(status in ('draft','published')),
 created_by_character_id uuid references public.characters(id) on delete set null,
 published_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(section_id,student_character_id,term)
);
alter table public.student_report_cards enable row level security;
grant select,insert,update on public.student_report_cards to authenticated;
revoke delete on public.student_report_cards from authenticated;
create policy "students read own published report cards" on public.student_report_cards for select to authenticated using(status='published' and private.user_owns_character(student_character_id));
create policy "instructors read own section report cards" on public.student_report_cards for select to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=student_report_cards.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()));
create policy "instructors create own section report cards" on public.student_report_cards for insert to authenticated with check(private.user_owns_character(created_by_character_id) and exists(select 1 from public.section_memberships sm where sm.section_id=student_report_cards.section_id and sm.character_id=student_report_cards.created_by_character_id and sm.relationship='instructor') and exists(select 1 from public.section_memberships student where student.section_id=student_report_cards.section_id and student.character_id=student_report_cards.student_character_id and student.relationship='student'));
create policy "instructors update own section report cards" on public.student_report_cards for update to authenticated using(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=student_report_cards.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid())) with check(exists(select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id where sm.section_id=student_report_cards.section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()));

create or replace function private.student_transcript_internal(viewer_character_id uuid)
returns table(report_id uuid,term text,course_code text,course_title text,section_code text,numeric_grade numeric,letter_grade text,instructor_comment text,published_at timestamptz)
language sql stable security definer set search_path=public,private as $$
 select r.id,r.term,co.code,co.title,s.section_code,r.numeric_grade,r.letter_grade,r.instructor_comment,r.published_at
 from public.student_report_cards r join public.class_sections s on s.id=r.section_id join public.academic_courses co on co.id=s.course_id
 where r.student_character_id=viewer_character_id and r.status='published' and private.user_owns_character(viewer_character_id)
 order by r.term desc,co.code;
$$;
create or replace function public.student_transcript(viewer_character_id uuid)
returns table(report_id uuid,term text,course_code text,course_title text,section_code text,numeric_grade numeric,letter_grade text,instructor_comment text,published_at timestamptz)
language sql stable security invoker set search_path=private as $$select * from private.student_transcript_internal(viewer_character_id);$$;
revoke all on function private.student_transcript_internal(uuid) from public,anon;
grant execute on function private.student_transcript_internal(uuid) to authenticated;
grant execute on function public.student_transcript(uuid) to authenticated;
