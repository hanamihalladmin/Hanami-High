-- Hanami High v2 Phase 2: Discord identity sync, character session runtime, and account-level capabilities.

alter table public.accounts
  add column if not exists discord_username text,
  add column if not exists discord_avatar_url text;

insert into public.accounts (id)
select u.id from auth.users u
on conflict (id) do nothing;

create or replace function private.sync_discord_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id)
  values (new.user_id)
  on conflict (id) do nothing;

  if new.provider = 'discord' then
    update public.accounts
    set discord_user_id = new.provider_id,
        discord_username = coalesce(
          nullif(new.identity_data ->> 'user_name', ''),
          nullif(new.identity_data ->> 'preferred_username', ''),
          nullif(new.identity_data ->> 'name', '')
        ),
        discord_avatar_url = coalesce(
          nullif(new.identity_data ->> 'avatar_url', ''),
          nullif(new.identity_data ->> 'picture', '')
        )
    where id = new.user_id;
  end if;

  return new;
end;
$$;
revoke all on function private.sync_discord_identity() from public, anon, authenticated;

create trigger on_auth_identity_synced
  after insert or update of provider_id, identity_data, provider on auth.identities
  for each row execute function private.sync_discord_identity();

update public.accounts a
set discord_user_id = i.provider_id,
    discord_username = coalesce(
      nullif(i.identity_data ->> 'user_name', ''),
      nullif(i.identity_data ->> 'preferred_username', ''),
      nullif(i.identity_data ->> 'name', '')
    ),
    discord_avatar_url = coalesce(
      nullif(i.identity_data ->> 'avatar_url', ''),
      nullif(i.identity_data ->> 'picture', '')
    )
from auth.identities i
where i.user_id = a.id
  and i.provider = 'discord';

create or replace function private.handle_new_character()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.character_profiles (character_id)
  values (new.id)
  on conflict (character_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_character() from public, anon, authenticated;

create trigger on_character_created
  after insert on public.characters
  for each row execute function private.handle_new_character();

insert into public.character_profiles (character_id)
select c.id from public.characters c
on conflict (character_id) do nothing;

create or replace function private.active_character_belongs_to_account(p_account_id uuid, p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_character_id is null or exists (
    select 1
    from public.characters c
    where c.id = p_character_id
      and c.account_id = p_account_id
      and c.character_state = 'active'
  );
$$;
revoke all on function private.active_character_belongs_to_account(uuid, uuid) from public, anon, authenticated;

create or replace function private.enforce_active_character_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.active_character_belongs_to_account(new.id, new.active_character_id) then
    raise exception 'active_character_id must reference an active character owned by this account'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_active_character_ownership() from public, anon, authenticated;

create trigger accounts_enforce_active_character
  before insert or update of active_character_id on public.accounts
  for each row execute function private.enforce_active_character_ownership();

create or replace function public.create_student_character_slot(p_slot_no smallint)
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

  insert into public.characters (account_id, slot_no, character_kind, character_state)
  values ((select auth.uid()), p_slot_no, 'student', 'draft')
  returning * into v_character;

  return v_character;
end;
$$;
revoke all on function public.create_student_character_slot(smallint) from public, anon;
grant execute on function public.create_student_character_slot(smallint) to authenticated;

create or replace function public.set_active_character(p_character_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.accounts
  set active_character_id = p_character_id
  where id = (select auth.uid())
  returning active_character_id into v_active;

  if not found then
    raise exception 'Hanami account not found' using errcode = 'P0002';
  end if;

  return v_active;
end;
$$;
revoke all on function public.set_active_character(uuid) from public, anon;
grant execute on function public.set_active_character(uuid) to authenticated;

create or replace function public.current_platform_roles()
returns table(code text)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.code::text
  from public.account_platform_roles apr
  join public.platform_roles r on r.id = apr.role_id
  where apr.account_id = (select auth.uid())
  order by r.code::text;
$$;
revoke all on function public.current_platform_roles() from public, anon;
grant execute on function public.current_platform_roles() to authenticated;

create or replace function public.current_capabilities()
returns table(code text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct prc.capability_code::text
  from public.account_platform_roles apr
  join public.platform_role_capabilities prc on prc.role_id = apr.role_id
  where apr.account_id = (select auth.uid())
  order by prc.capability_code::text;
$$;
revoke all on function public.current_capabilities() from public, anon;
grant execute on function public.current_capabilities() to authenticated;

comment on function public.create_student_character_slot(smallint) is 'Creates one of the two hard-limited student character slots for the signed-in account.';
comment on function public.set_active_character(uuid) is 'Persists the signed-in account active character. Only owned active characters are accepted.';
