create or replace function private.owner_discord_guild_configuration_internal()
returns table(guild_id text)
language plpgsql stable security definer set search_path=public,private,auth as $$
begin
  if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
  return query select c.value from public.portal_authorization_config c where c.key='discord_guild_id';
end;$$;

create or replace function public.owner_discord_guild_configuration()
returns table(guild_id text)
language sql stable security invoker set search_path=public,private,auth as $$
  select * from private.owner_discord_guild_configuration_internal();
$$;

create or replace function private.owner_set_discord_guild_id_internal(requested_guild_id text)
returns void
language plpgsql security definer set search_path=public,private,auth as $$
declare clean_id text:=trim(coalesce(requested_guild_id,''));
begin
  if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
  if clean_id !~ '^\d{16,22}$' then raise exception 'Invalid Discord server ID'; end if;
  insert into public.portal_authorization_config(key,value,updated_at)
  values('discord_guild_id',clean_id,now())
  on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  insert into public.system_audit_log(actor_user_id,action,target_type,target_id,details)
  values(auth.uid(),'owner_discord_guild_updated','portal_authorization_config','discord_guild_id',jsonb_build_object('guild_id',clean_id));
end;$$;

create or replace function public.owner_set_discord_guild_id(requested_guild_id text)
returns void language sql security invoker set search_path=public,private,auth as $$
  select private.owner_set_discord_guild_id_internal(requested_guild_id);
$$;

revoke all on function private.owner_discord_guild_configuration_internal(),private.owner_set_discord_guild_id_internal(text) from public,anon;
grant execute on function private.owner_discord_guild_configuration_internal(),private.owner_set_discord_guild_id_internal(text) to authenticated;
revoke all on function public.owner_discord_guild_configuration(),public.owner_set_discord_guild_id(text) from public,anon;
grant execute on function public.owner_discord_guild_configuration(),public.owner_set_discord_guild_id(text) to authenticated;
