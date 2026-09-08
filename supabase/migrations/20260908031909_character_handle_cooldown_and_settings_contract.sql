alter table public.characters
  add column if not exists handle_changed_at timestamptz;

comment on column public.characters.handle_changed_at is 'Last member/admin handle change timestamp. Member changes are limited to once per 7 days; existing pre-migration characters with NULL may change immediately.';

create or replace function private.enforce_character_handle_rules()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  normalized text;
  privileged boolean := false;
begin
  normalized := lower(trim(both '@' from trim(new.handle)));
  if normalized !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Handle must be 3-24 lowercase letters, numbers, or underscores.' using errcode='22023';
  end if;
  new.handle := normalized;

  if tg_op = 'INSERT' then
    new.handle_changed_at := coalesce(new.handle_changed_at, now());
    return new;
  end if;

  if new.handle is distinct from old.handle then
    begin
      privileged := coalesce(private.hanami_admin_or_owner(), false);
    exception when others then
      privileged := false;
    end;

    if not privileged
       and old.owner_user_id = (select auth.uid())
       and old.handle_changed_at is not null
       and now() < old.handle_changed_at + interval '7 days' then
      raise exception 'This handle can be changed again on %.', old.handle_changed_at + interval '7 days'
        using errcode='P0001', hint='Hanami members may change each character handle once every 7 days.';
    end if;

    new.handle_changed_at := now();
  else
    new.handle_changed_at := old.handle_changed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_character_handle_rules on public.characters;
create trigger enforce_character_handle_rules
before insert or update of handle, handle_changed_at on public.characters
for each row execute function private.enforce_character_handle_rules();

create or replace function public.change_my_character_handle(p_character_id uuid, p_handle text)
returns table(handle text, handle_changed_at timestamptz, next_handle_change_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  changed public.characters%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  update public.characters
     set handle = p_handle
   where id = p_character_id
     and owner_user_id = (select auth.uid())
  returning * into changed;

  if changed.id is null then
    raise exception 'Character not found or not owned by this account.' using errcode='42501';
  end if;

  return query
  select changed.handle,
         changed.handle_changed_at,
         changed.handle_changed_at + interval '7 days';
end;
$$;

revoke all on function public.change_my_character_handle(uuid,text) from public, anon;
grant execute on function public.change_my_character_handle(uuid,text) to authenticated, service_role;
