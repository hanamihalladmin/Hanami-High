-- Phase 3 security: enforce applicant lifecycle transitions in a BEFORE UPDATE trigger so public RPCs remain SECURITY INVOKER.

grant update (status, acceptance_letter_opened_at) on public.student_applications to authenticated;

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
  and status in ('draft', 'changes_requested', 'submitted')
);

create policy student_applications_open_letter_own
on public.student_applications for update
to authenticated
using (
  applicant_account_id = (select auth.uid())
  and status = 'accepted'
)
with check (
  applicant_account_id = (select auth.uid())
  and status = 'accepted'
);

create or replace function private.guard_student_application_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_character public.characters;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if v_uid is null or old.applicant_account_id <> v_uid or new.applicant_account_id <> v_uid then
    raise exception 'You may only modify your own student application' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (old.status in ('draft', 'changes_requested') and new.status = 'submitted') then
      raise exception 'Applicants cannot set this application status' using errcode = '23514';
    end if;

    select * into v_character
    from public.characters
    where id = old.character_id
      and account_id = v_uid;

    if not found then
      raise exception 'Character not found' using errcode = 'P0002';
    end if;

    if nullif(trim(coalesce(v_character.first_name, '')), '') is null
       or nullif(trim(coalesce(v_character.last_name, '')), '') is null
       or new.school_year is null
       or new.age is null
       or nullif(trim(coalesce(new.personality, '')), '') is null
       or nullif(trim(coalesce(new.background, '')), '') is null
       or not new.rules_read
       or not new.serious_rp_ack
       or not new.character_limit_ack
       or not new.deletion_ack then
      raise exception 'Complete all required enrollment fields and acknowledgements before submitting' using errcode = '23514';
    end if;

    new.submitted_at := now();

    update public.characters
    set character_state = 'submitted'
    where id = old.character_id;
  end if;

  if new.acceptance_letter_opened_at is distinct from old.acceptance_letter_opened_at then
    if old.status <> 'accepted' or new.status <> 'accepted' then
      raise exception 'Acceptance letter is not available for this application' using errcode = '23514';
    end if;
    new.acceptance_letter_opened_at := coalesce(old.acceptance_letter_opened_at, now());
  end if;

  return new;
end;
$$;
revoke all on function private.guard_student_application_update() from public, anon, authenticated;

create trigger student_applications_guard_applicant_transition
before update on public.student_applications
for each row execute function private.guard_student_application_update();

create or replace function public.submit_student_application(p_character_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.student_applications
  set status = 'submitted'
  where character_id = p_character_id
    and applicant_account_id = (select auth.uid())
    and status in ('draft', 'changes_requested');

  if not found then
    raise exception 'Application cannot be submitted from its current state' using errcode = '23514';
  end if;

  return 'submitted';
end;
$$;
revoke all on function public.submit_student_application(uuid) from public, anon;
grant execute on function public.submit_student_application(uuid) to authenticated;

create or replace function public.mark_acceptance_letter_opened(p_character_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_opened timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.student_applications
  set acceptance_letter_opened_at = now()
  where character_id = p_character_id
    and applicant_account_id = (select auth.uid())
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
