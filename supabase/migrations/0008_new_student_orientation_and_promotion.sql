-- Hanami High v2 Phase 3: persistent New Student orientation + Owner-controlled promotion.

create table public.character_orientations (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  track text not null check (track in ('full', 'returning')),
  version smallint not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.character_orientation_tasks (
  character_id uuid not null references public.character_orientations(character_id) on delete cascade,
  task_code text not null check (task_code in (
    'acceptance_letter', 'student_identity', 'schedule', 'network', 'profile_customization', 'boutique_preview'
  )),
  required boolean not null default true,
  completed_at timestamptz,
  primary key (character_id, task_code)
);

create table public.student_status_actions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null unique references public.characters(id) on delete cascade,
  actor_account_id uuid not null references public.accounts(id) on delete restrict,
  action text not null default 'promote_to_student' check (action = 'promote_to_student'),
  note text,
  created_at timestamptz not null default now()
);

create index character_orientations_account_idx on public.character_orientations(account_id, completed_at);
create index student_status_actions_actor_idx on public.student_status_actions(actor_account_id, created_at desc);

create trigger character_orientations_touch_updated_at
before update on public.character_orientations
for each row execute function private.touch_updated_at();

create or replace function private.initialize_new_student_orientation_row(p_character_id uuid, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_track text;
begin
  if exists (
    select 1
    from public.characters other
    where other.account_id = p_account_id
      and other.id <> p_character_id
      and other.school_role in ('new_student', 'student')
  ) then
    v_track := 'returning';
  else
    v_track := 'full';
  end if;

  insert into public.character_orientations (character_id, account_id, track)
  values (p_character_id, p_account_id, v_track)
  on conflict (character_id) do nothing;

  insert into public.character_orientation_tasks (character_id, task_code, required)
  values
    (p_character_id, 'acceptance_letter', true),
    (p_character_id, 'student_identity', true),
    (p_character_id, 'schedule', true),
    (p_character_id, 'network', v_track = 'full'),
    (p_character_id, 'profile_customization', true),
    (p_character_id, 'boutique_preview', v_track = 'full')
  on conflict (character_id, task_code) do nothing;
end;
$$;
revoke all on function private.initialize_new_student_orientation_row(uuid, uuid) from public, anon, authenticated;

create or replace function private.initialize_new_student_orientation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.school_role = 'new_student'
     and new.school_role is distinct from old.school_role then
    perform private.initialize_new_student_orientation_row(new.id, new.account_id);
  end if;
  return new;
end;
$$;
revoke all on function private.initialize_new_student_orientation() from public, anon, authenticated;

create trigger characters_initialize_new_student_orientation
after update of school_role on public.characters
for each row execute function private.initialize_new_student_orientation();

do $$
declare
  r record;
begin
  for r in select id, account_id from public.characters where school_role = 'new_student' loop
    perform private.initialize_new_student_orientation_row(r.id, r.account_id);
  end loop;
end;
$$;

create or replace function private.sync_acceptance_letter_orientation_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.acceptance_letter_opened_at is not null
     and old.acceptance_letter_opened_at is distinct from new.acceptance_letter_opened_at then
    update public.character_orientation_tasks
    set completed_at = coalesce(completed_at, new.acceptance_letter_opened_at)
    where character_id = new.character_id
      and task_code = 'acceptance_letter';
  end if;
  return new;
end;
$$;
revoke all on function private.sync_acceptance_letter_orientation_task() from public, anon, authenticated;

create trigger student_application_sync_acceptance_orientation
after update of acceptance_letter_opened_at on public.student_applications
for each row execute function private.sync_acceptance_letter_orientation_task();

update public.character_orientation_tasks task
set completed_at = app.acceptance_letter_opened_at
from public.student_applications app
where task.character_id = app.character_id
  and task.task_code = 'acceptance_letter'
  and task.completed_at is null
  and app.acceptance_letter_opened_at is not null;

create or replace function private.recalculate_orientation_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_complete boolean;
  v_completed_at timestamptz;
begin
  select not exists (
    select 1
    from public.character_orientation_tasks t
    where t.character_id = new.character_id
      and t.required
      and t.completed_at is null
  ) into v_complete;

  if v_complete then
    v_completed_at := now();

    update public.character_orientations
    set completed_at = coalesce(completed_at, v_completed_at)
    where character_id = new.character_id;

    update public.characters
    set orientation_completed_at = coalesce(orientation_completed_at, v_completed_at)
    where id = new.character_id;
  end if;

  return new;
end;
$$;
revoke all on function private.recalculate_orientation_completion() from public, anon, authenticated;

create trigger orientation_task_recalculate_completion
after update of completed_at on public.character_orientation_tasks
for each row execute function private.recalculate_orientation_completion();

alter table public.character_orientations enable row level security;
alter table public.character_orientation_tasks enable row level security;
alter table public.student_status_actions enable row level security;

revoke all on table public.character_orientations from anon, authenticated;
revoke all on table public.character_orientation_tasks from anon, authenticated;
revoke all on table public.student_status_actions from anon, authenticated;

grant select on public.character_orientations to authenticated;
grant select on public.character_orientation_tasks to authenticated;
grant update (completed_at) on public.character_orientation_tasks to authenticated;
grant select, insert on public.student_status_actions to authenticated;

create policy character_orientations_select_own
on public.character_orientations for select
to authenticated
using (account_id = (select auth.uid()));

create policy character_orientations_select_promoters
on public.character_orientations for select
to authenticated
using ((select public.has_capability('students.promote')));

create policy orientation_tasks_select_own
on public.character_orientation_tasks for select
to authenticated
using (exists (
  select 1 from public.character_orientations o
  where o.character_id = character_orientation_tasks.character_id
    and o.account_id = (select auth.uid())
));

create policy orientation_tasks_select_promoters
on public.character_orientation_tasks for select
to authenticated
using ((select public.has_capability('students.promote')));

create policy orientation_tasks_update_own
on public.character_orientation_tasks for update
to authenticated
using (exists (
  select 1 from public.character_orientations o
  join public.characters c on c.id = o.character_id
  where o.character_id = character_orientation_tasks.character_id
    and o.account_id = (select auth.uid())
    and c.school_role = 'new_student'
))
with check (exists (
  select 1 from public.character_orientations o
  join public.characters c on c.id = o.character_id
  where o.character_id = character_orientation_tasks.character_id
    and o.account_id = (select auth.uid())
    and c.school_role = 'new_student'
));

create policy student_status_actions_select_own
on public.student_status_actions for select
to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = student_status_actions.character_id
    and c.account_id = (select auth.uid())
));

create policy student_status_actions_select_promoters
on public.student_status_actions for select
to authenticated
using ((select public.has_capability('students.promote')));

create policy student_status_actions_insert_promoters
on public.student_status_actions for insert
to authenticated
with check (
  actor_account_id = (select auth.uid())
  and (select public.has_capability('students.promote'))
);

create policy characters_select_student_promoters
on public.characters for select
to authenticated
using ((select public.has_capability('students.promote')));

create or replace function public.complete_orientation_task(p_character_id uuid, p_task_code text)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_completed timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_task_code = 'acceptance_letter' then
    raise exception 'The acceptance-letter step is completed by opening the acceptance letter' using errcode = '23514';
  end if;

  update public.character_orientation_tasks t
  set completed_at = coalesce(t.completed_at, now())
  where t.character_id = p_character_id
    and t.task_code = p_task_code
    and exists (
      select 1
      from public.character_orientations o
      join public.characters c on c.id = o.character_id
      where o.character_id = t.character_id
        and o.account_id = (select auth.uid())
        and c.school_role = 'new_student'
    )
  returning completed_at into v_completed;

  if not found then
    raise exception 'Orientation task not available' using errcode = 'P0002';
  end if;

  return v_completed;
end;
$$;
revoke all on function public.complete_orientation_task(uuid, text) from public, anon;
grant execute on function public.complete_orientation_task(uuid, text) to authenticated;

create or replace function private.apply_student_promotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.characters
  set school_role = 'student',
      promoted_to_student_at = now()
  where id = new.character_id
    and school_role = 'new_student';

  if not found then
    raise exception 'Only New Students can be promoted to Student' using errcode = '23514';
  end if;

  return new;
end;
$$;
revoke all on function private.apply_student_promotion() from public, anon, authenticated;

create trigger student_status_action_apply_promotion
after insert on public.student_status_actions
for each row execute function private.apply_student_promotion();

grant select, insert, update, delete on public.character_orientations to service_role;
grant select, insert, update, delete on public.character_orientation_tasks to service_role;
grant select, insert, update, delete on public.student_status_actions to service_role;

comment on table public.character_orientations is 'Character-level orientation. Completion never changes New Student role.';
comment on table public.student_status_actions is 'Audited Owner-level New Student -> Student promotion events.';
