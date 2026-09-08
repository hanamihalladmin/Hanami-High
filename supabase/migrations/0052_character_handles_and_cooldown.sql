alter table public.characters
  add column if not exists handle_changed_at timestamptz;

create or replace function private.validate_character_handle_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handle text;
  v_can_override boolean := false;
begin
  if new.handle is null then
    if tg_op = 'INSERT' and new.account_id = (select auth.uid()) and new.character_kind = 'student' and new.character_state = 'draft' then
      raise exception 'Choose a handle before creating your character' using errcode = '23514';
    end if;
    return new;
  end if;

  v_handle := lower(trim(new.handle::text));
  if v_handle !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Handles must be 3-24 characters using lowercase letters, numbers, and underscores only' using errcode = '22023';
  end if;
  new.handle := v_handle::citext;

  if tg_op = 'INSERT' then
    new.handle_changed_at := coalesce(new.handle_changed_at, now());
    return new;
  end if;

  if old.handle is distinct from new.handle then
    begin
      v_can_override := public.has_capability('accounts.manage');
    exception when others then
      v_can_override := false;
    end;

    if not v_can_override
       and old.handle_changed_at is not null
       and old.handle_changed_at > now() - interval '7 days' then
      raise exception 'This handle can be changed again after %', old.handle_changed_at + interval '7 days' using errcode = 'P0001';
    end if;
    new.handle_changed_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.validate_character_handle_change() from public, anon, authenticated;

drop trigger if exists characters_validate_handle_change on public.characters;
create trigger characters_validate_handle_change
before insert or update of handle on public.characters
for each row execute function private.validate_character_handle_change();

create or replace function private.sync_published_character_handle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.handle is distinct from new.handle then
    update public.published_character_profiles
       set handle = new.handle::text,
           updated_at = now()
     where character_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_published_character_handle() from public, anon, authenticated;

drop trigger if exists characters_sync_published_handle on public.characters;
create trigger characters_sync_published_handle
after update of handle on public.characters
for each row execute function private.sync_published_character_handle();

drop function if exists public.create_student_character_slot(smallint);
create function public.create_student_character_slot(p_slot_no smallint, p_handle text)
returns public.characters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_character public.characters;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_slot_no not between 1 and 2 then
    raise exception 'Character slot must be 1 or 2' using errcode = '22023';
  end if;

  insert into public.characters (account_id, slot_no, handle, character_kind, character_state)
  values ((select auth.uid()), p_slot_no, lower(trim(p_handle))::citext, 'student', 'draft')
  returning * into v_character;

  return v_character;
exception
  when unique_violation then
    raise exception 'That handle is already taken' using errcode = '23505';
end;
$$;

grant execute on function public.create_student_character_slot(smallint, text) to authenticated;

create or replace function public.change_character_handle(p_character_id uuid, p_handle text)
returns public.characters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_character public.characters;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.characters
     set handle = lower(trim(p_handle))::citext
   where id = p_character_id
     and account_id = (select auth.uid())
  returning * into v_character;

  if v_character.id is null then
    raise exception 'Character not found or not owned by this account' using errcode = '42501';
  end if;

  return v_character;
exception
  when unique_violation then
    raise exception 'That handle is already taken' using errcode = '23505';
end;
$$;

grant execute on function public.change_character_handle(uuid, text) to authenticated;