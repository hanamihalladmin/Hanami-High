-- Phase 3 hardening: applicants edit dossier fields only; lifecycle transitions occur only through validated RPCs/reviews.

revoke update (status, acceptance_letter_opened_at) on public.student_applications from authenticated;

drop policy if exists student_applications_update_own_editable on public.student_applications;
create policy student_applications_update_own_editable
on public.student_applications for update
to authenticated
using (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'changes_requested')
)
with check (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'changes_requested')
);

create or replace function public.submit_student_application(p_character_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_application public.student_applications;
  v_character public.characters;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_character
  from public.characters
  where id = p_character_id
    and account_id = v_uid;

  if not found then
    raise exception 'Character not found' using errcode = 'P0002';
  end if;

  if v_character.character_kind <> 'student' then
    raise exception 'Only student characters use the student enrollment application' using errcode = '22023';
  end if;

  select * into v_application
  from public.student_applications
  where character_id = p_character_id
    and applicant_account_id = v_uid;

  if not found then
    raise exception 'Student application not found' using errcode = 'P0002';
  end if;

  if v_application.status not in ('draft', 'changes_requested') then
    raise exception 'This application cannot be submitted from its current state' using errcode = '23514';
  end if;

  if nullif(trim(coalesce(v_character.first_name, '')), '') is null
     or nullif(trim(coalesce(v_character.last_name, '')), '') is null
     or v_application.school_year is null
     or v_application.age is null
     or nullif(trim(coalesce(v_application.personality, '')), '') is null
     or nullif(trim(coalesce(v_application.background, '')), '') is null
     or not v_application.rules_read
     or not v_application.serious_rp_ack
     or not v_application.character_limit_ack
     or not v_application.deletion_ack then
    raise exception 'Complete all required enrollment fields and acknowledgements before submitting' using errcode = '23514';
  end if;

  update public.student_applications
  set status = 'submitted',
      submitted_at = now()
  where character_id = p_character_id;

  update public.characters
  set character_state = 'submitted'
  where id = p_character_id;

  return 'submitted';
end;
$$;
revoke all on function public.submit_student_application(uuid) from public, anon;
grant execute on function public.submit_student_application(uuid) to authenticated;

create or replace function public.mark_acceptance_letter_opened(p_character_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_opened timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.student_applications
  set acceptance_letter_opened_at = coalesce(acceptance_letter_opened_at, now())
  where character_id = p_character_id
    and applicant_account_id = v_uid
    and status = 'accepted'
  returning acceptance_letter_opened_at into v_opened;

  if not found then
    raise exception 'Accepted application not found' using errcode = 'P0002';
  end if;

  return v_opened;
end;
$$;
revoke all on function public.mark_acceptance_letter_opened(uuid) from public, anon;
grant execute on function public.mark_acceptance_letter_opened(uuid) to authenticated;
