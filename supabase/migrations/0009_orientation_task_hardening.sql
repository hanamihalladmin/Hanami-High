-- Keep returning-member orientation based on account history, even if the earlier character is later archived.
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
    from public.character_orientations prior
    where prior.account_id = p_account_id
      and prior.character_id <> p_character_id
  ) or exists (
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

create or replace function private.guard_orientation_task_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if old.task_code = 'acceptance_letter'
     and new.completed_at is distinct from old.completed_at then
    raise exception 'Acceptance-letter orientation is completed only by opening the acceptance letter' using errcode = '23514';
  end if;

  if old.completed_at is not null then
    new.completed_at := old.completed_at;
  elsif new.completed_at is not null then
    new.completed_at := now();
  end if;

  return new;
end;
$$;
revoke all on function private.guard_orientation_task_update() from public, anon, authenticated;

create trigger orientation_tasks_guard_progress
before update on public.character_orientation_tasks
for each row execute function private.guard_orientation_task_update();
