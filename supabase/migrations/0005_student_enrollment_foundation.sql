-- Hanami High v2 Phase 3: student application lifecycle, review history, and acceptance-letter state.

create table public.student_applications (
  character_id uuid primary key references public.characters(id) on delete cascade,
  applicant_account_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'changes_requested', 'accepted', 'denied')),
  school_year smallint check (school_year in (1, 2)),
  nickname text,
  pronouns text,
  birth_date date,
  age smallint check (age is null or age between 14 and 19),
  height_cm smallint check (height_cm is null or height_cm between 120 and 220),
  appearance_description text,
  distinguishing_features text,
  personality text,
  likes text,
  dislikes text,
  hobbies text,
  strengths text,
  weaknesses text,
  background text,
  attendance_reason text,
  family_information text,
  additional_notes text,
  club_interests text[] not null default '{}',
  elective_preference text check (elective_preference is null or elective_preference in ('art', 'computer', 'undecided')),
  rules_read boolean not null default false,
  serious_rp_ack boolean not null default false,
  character_limit_ack boolean not null default false,
  deletion_ack boolean not null default false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.accounts(id) on delete set null,
  accepted_at timestamptz,
  acceptance_letter_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.student_applications(character_id) on delete cascade,
  reviewer_account_id uuid not null references public.accounts(id) on delete restrict,
  decision text not null check (decision in ('changes_requested', 'accepted', 'denied')),
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index student_applications_account_idx on public.student_applications(applicant_account_id, status);
create index student_applications_status_idx on public.student_applications(status, submitted_at desc);
create index application_reviews_character_idx on public.application_reviews(character_id, created_at desc);
create index application_reviews_reviewer_idx on public.application_reviews(reviewer_account_id, created_at desc);

create trigger student_applications_touch_updated_at
before update on public.student_applications
for each row execute function private.touch_updated_at();

create or replace function private.create_student_application_for_character()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.character_kind = 'student' then
    insert into public.student_applications (character_id, applicant_account_id)
    values (new.id, new.account_id)
    on conflict (character_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.create_student_application_for_character() from public, anon, authenticated;

create trigger on_student_character_created
  after insert on public.characters
  for each row execute function private.create_student_application_for_character();

insert into public.student_applications (character_id, applicant_account_id)
select c.id, c.account_id
from public.characters c
where c.character_kind = 'student'
on conflict (character_id) do nothing;

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_platform_roles apr
    join public.platform_role_capabilities prc on prc.role_id = apr.role_id
    where apr.account_id = (select auth.uid())
      and prc.capability_code::text = p_capability
  );
$$;
revoke all on function public.has_capability(text) from public, anon;
grant execute on function public.has_capability(text) to authenticated;

alter table public.student_applications enable row level security;
alter table public.application_reviews enable row level security;

revoke all on table public.student_applications from anon, authenticated;
revoke all on table public.application_reviews from anon, authenticated;

grant select on table public.student_applications to authenticated;
grant update (
  school_year, nickname, pronouns, birth_date, age, height_cm,
  appearance_description, distinguishing_features, personality,
  likes, dislikes, hobbies, strengths, weaknesses, background,
  attendance_reason, family_information, additional_notes,
  club_interests, elective_preference, rules_read, serious_rp_ack,
  character_limit_ack, deletion_ack, status, acceptance_letter_opened_at
) on table public.student_applications to authenticated;

grant select, insert on table public.application_reviews to authenticated;

create policy student_applications_select_own
on public.student_applications for select
to authenticated
using (applicant_account_id = (select auth.uid()));

create policy student_applications_select_reviewers
on public.student_applications for select
to authenticated
using ((select public.has_capability('characters.review')));

create policy student_applications_update_own_editable
on public.student_applications for update
to authenticated
using (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'changes_requested', 'accepted')
)
with check (
  applicant_account_id = (select auth.uid())
  and status in ('draft', 'submitted', 'changes_requested', 'accepted')
);

create policy application_reviews_select_applicant
on public.application_reviews for select
to authenticated
using (exists (
  select 1
  from public.student_applications a
  where a.character_id = application_reviews.character_id
    and a.applicant_account_id = (select auth.uid())
));

create policy application_reviews_select_reviewers
on public.application_reviews for select
to authenticated
using ((select public.has_capability('characters.review')));

create policy application_reviews_insert_reviewers
on public.application_reviews for insert
to authenticated
with check (
  reviewer_account_id = (select auth.uid())
  and (select public.has_capability('characters.review'))
);

create policy characters_select_application_reviewers
on public.characters for select
to authenticated
using ((select public.has_capability('characters.review')));

create or replace function public.submit_student_application(p_character_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application public.student_applications;
  v_character public.characters;
begin
  select * into v_character
  from public.characters
  where id = p_character_id
    and account_id = (select auth.uid());

  if not found then
    raise exception 'Character not found' using errcode = 'P0002';
  end if;

  if v_character.character_kind <> 'student' then
    raise exception 'Only student characters use the student enrollment application' using errcode = '22023';
  end if;

  select * into v_application
  from public.student_applications
  where character_id = p_character_id
    and applicant_account_id = (select auth.uid());

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

create or replace function private.apply_application_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.student_applications
  where character_id = new.character_id
  for update;

  if v_status <> 'submitted' then
    raise exception 'Only submitted applications may be reviewed' using errcode = '23514';
  end if;

  if new.decision = 'changes_requested' then
    update public.student_applications
    set status = 'changes_requested',
        reviewed_at = now(),
        reviewed_by = new.reviewer_account_id
    where character_id = new.character_id;

    update public.characters
    set character_state = 'changes_requested'
    where id = new.character_id;

  elsif new.decision = 'accepted' then
    update public.student_applications
    set status = 'accepted',
        reviewed_at = now(),
        reviewed_by = new.reviewer_account_id,
        accepted_at = now()
    where character_id = new.character_id;

    update public.characters c
    set character_state = 'active',
        school_role = 'new_student'
    where c.id = new.character_id;

    update public.character_profiles p
    set pronouns = coalesce(p.pronouns, a.pronouns)
    from public.student_applications a
    where p.character_id = a.character_id
      and a.character_id = new.character_id;

  elsif new.decision = 'denied' then
    update public.student_applications
    set status = 'denied',
        reviewed_at = now(),
        reviewed_by = new.reviewer_account_id
    where character_id = new.character_id;

    update public.characters
    set character_state = 'denied'
    where id = new.character_id;
  end if;

  return new;
end;
$$;
revoke all on function private.apply_application_review() from public, anon, authenticated;

create trigger application_review_applies_decision
  after insert on public.application_reviews
  for each row execute function private.apply_application_review();

create or replace function public.mark_acceptance_letter_opened(p_character_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_opened timestamptz;
begin
  update public.student_applications
  set acceptance_letter_opened_at = coalesce(acceptance_letter_opened_at, now())
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

grant select, insert, update, delete on public.student_applications to service_role;
grant select, insert, update, delete on public.application_reviews to service_role;

comment on table public.student_applications is 'Student enrollment dossier. Application status is separate from New Student orientation/promotion.';
comment on table public.application_reviews is 'Immutable application review decision history with reviewer messages.';
