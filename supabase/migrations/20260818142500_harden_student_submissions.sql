drop policy if exists "students create own submissions" on public.assignment_submissions;
drop policy if exists "students update own unreturned submissions" on public.assignment_submissions;

create policy "students create own submissions"
on public.assignment_submissions for insert to authenticated
with check (
  status in ('draft', 'submitted')
  and grade is null
  and feedback = ''
  and exists (
    select 1
    from public.characters c
    join public.course_assignments a on a.id = assignment_submissions.assignment_id
    join public.section_memberships sm on sm.section_id = a.section_id and sm.character_id = c.id
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
      and sm.relationship = 'student'
      and a.status = 'published'
  )
);

create policy "students update own draft submissions"
on public.assignment_submissions for update to authenticated
using (
  status = 'draft'
  and exists (
    select 1 from public.characters c
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
)
with check (
  status in ('draft', 'submitted')
  and grade is null
  and feedback = ''
  and exists (
    select 1 from public.characters c
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);
