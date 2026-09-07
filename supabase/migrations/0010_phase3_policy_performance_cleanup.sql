-- Phase 3 final performance cleanup: cover review FK and consolidate equivalent permissive RLS policies.

create index if not exists student_applications_reviewed_by_idx
  on public.student_applications(reviewed_by);

-- Application reviews: own application OR admissions reviewer.
drop policy if exists application_reviews_select_applicant on public.application_reviews;
drop policy if exists application_reviews_select_reviewers on public.application_reviews;
create policy application_reviews_select_visible
on public.application_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.student_applications a
    where a.character_id = application_reviews.character_id
      and a.applicant_account_id = (select auth.uid())
  )
  or (select public.has_capability('characters.review'))
);

-- Character orientations: owner OR Student-status promoter.
drop policy if exists character_orientations_select_own on public.character_orientations;
drop policy if exists character_orientations_select_promoters on public.character_orientations;
create policy character_orientations_select_visible
on public.character_orientations for select
to authenticated
using (
  account_id = (select auth.uid())
  or (select public.has_capability('students.promote'))
);

-- Orientation tasks: character owner OR Student-status promoter.
drop policy if exists orientation_tasks_select_own on public.character_orientation_tasks;
drop policy if exists orientation_tasks_select_promoters on public.character_orientation_tasks;
create policy orientation_tasks_select_visible
on public.character_orientation_tasks for select
to authenticated
using (
  exists (
    select 1
    from public.character_orientations o
    where o.character_id = character_orientation_tasks.character_id
      and o.account_id = (select auth.uid())
  )
  or (select public.has_capability('students.promote'))
);

-- Characters: owner OR application reviewer OR Student-status promoter.
drop policy if exists characters_select_own on public.characters;
drop policy if exists characters_select_application_reviewers on public.characters;
drop policy if exists characters_select_student_promoters on public.characters;
create policy characters_select_visible
on public.characters for select
to authenticated
using (
  account_id = (select auth.uid())
  or (select public.has_capability('characters.review'))
  or (select public.has_capability('students.promote'))
);

-- Student applications: applicant OR admissions reviewer.
drop policy if exists student_applications_select_own on public.student_applications;
drop policy if exists student_applications_select_reviewers on public.student_applications;
create policy student_applications_select_visible
on public.student_applications for select
to authenticated
using (
  applicant_account_id = (select auth.uid())
  or (select public.has_capability('characters.review'))
);

-- One applicant UPDATE policy handles editable drafts/changes and accepted-letter marking.
-- private.guard_student_application_update() enforces the exact old->new state transition.
drop policy if exists student_applications_update_own_editable on public.student_applications;
drop policy if exists student_applications_open_letter_own on public.student_applications;
create policy student_applications_update_own
on public.student_applications for update
to authenticated
using (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'changes_requested', 'accepted')
)
with check (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'changes_requested', 'submitted', 'accepted')
);

-- Promotion audit rows: promoted character owner OR promoter.
drop policy if exists student_status_actions_select_own on public.student_status_actions;
drop policy if exists student_status_actions_select_promoters on public.student_status_actions;
create policy student_status_actions_select_visible
on public.student_status_actions for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = student_status_actions.character_id
      and c.account_id = (select auth.uid())
  )
  or (select public.has_capability('students.promote'))
);
