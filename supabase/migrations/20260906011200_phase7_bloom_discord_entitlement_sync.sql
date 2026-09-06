create or replace function private.sync_hanami_bloom_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bloom_role_id text;
begin
  select nullif(trim(c.value), '')
    into bloom_role_id
    from public.portal_authorization_config c
   where c.key = 'hanami_bloom_discord_role_id'
   limit 1;

  if bloom_role_id is null then
    return new;
  end if;

  if bloom_role_id = any(new.role_ids) then
    insert into public.account_entitlements(user_id, entitlement_key, source_type, source_ref)
    values (new.user_id, 'hanami_bloom', 'discord_role', bloom_role_id)
    on conflict (user_id, entitlement_key) do update
      set source_type = case when public.account_entitlements.source_type = 'discord_role' then excluded.source_type else public.account_entitlements.source_type end,
          source_ref = case when public.account_entitlements.source_type = 'discord_role' then excluded.source_ref else public.account_entitlements.source_ref end;
  else
    delete from public.account_entitlements
     where user_id = new.user_id
       and entitlement_key = 'hanami_bloom'
       and source_type = 'discord_role';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_hanami_bloom_entitlement() from public, anon, authenticated;

drop trigger if exists sync_hanami_bloom_entitlement_after_role_sync on public.account_discord_role_sync;
create trigger sync_hanami_bloom_entitlement_after_role_sync
after insert or update of role_ids on public.account_discord_role_sync
for each row execute function private.sync_hanami_bloom_entitlement();

create or replace function private.refresh_hanami_bloom_entitlements()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bloom_role_id text;
begin
  select nullif(trim(c.value), '')
    into bloom_role_id
    from public.portal_authorization_config c
   where c.key = 'hanami_bloom_discord_role_id'
   limit 1;

  if bloom_role_id is null then
    return;
  end if;

  insert into public.account_entitlements(user_id, entitlement_key, source_type, source_ref)
  select r.user_id, 'hanami_bloom', 'discord_role', bloom_role_id
    from public.account_discord_role_sync r
   where bloom_role_id = any(r.role_ids)
  on conflict (user_id, entitlement_key) do update
    set source_type = case when public.account_entitlements.source_type = 'discord_role' then excluded.source_type else public.account_entitlements.source_type end,
        source_ref = case when public.account_entitlements.source_type = 'discord_role' then excluded.source_ref else public.account_entitlements.source_ref end;

  delete from public.account_entitlements e
   where e.entitlement_key = 'hanami_bloom'
     and e.source_type = 'discord_role'
     and not exists (
       select 1 from public.account_discord_role_sync r
        where r.user_id = e.user_id
          and bloom_role_id = any(r.role_ids)
     );
end;
$$;

revoke all on function private.refresh_hanami_bloom_entitlements() from public, anon, authenticated;
