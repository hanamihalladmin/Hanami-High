create or replace function private.bootstrap_owner_credential_internal(requested_handle text,requested_password text)
returns boolean language plpgsql security definer set search_path=public,private as $$
begin
 if not private.is_owner_discord_user() then raise exception 'Owner Discord identity required'; end if;
 if exists(select 1 from public.privileged_portal_credentials where portal_kind='owner') then raise exception 'Owner credential is already configured'; end if;
 if lower(trim(requested_handle)) !~ '^[a-z0-9_]{3,32}$' then raise exception 'Owner handle is invalid'; end if;
 if length(requested_password)<12 then raise exception 'Owner password must be at least 12 characters'; end if;
 insert into public.privileged_portal_credentials(portal_kind,handle,password_hash,bound_discord_user_id)
 values('owner',lower(trim(requested_handle)),crypt(requested_password,gen_salt('bf',12)),private.current_discord_user_id());
 return true;
end;$$;
revoke all on function private.bootstrap_owner_credential_internal(text,text) from public,anon;
grant execute on function private.bootstrap_owner_credential_internal(text,text) to authenticated;

create or replace function public.bootstrap_owner_credential(requested_handle text,requested_password text)
returns boolean language sql security invoker set search_path=private as $$ select private.bootstrap_owner_credential_internal(requested_handle,requested_password); $$;
revoke all on function public.bootstrap_owner_credential(text,text) from public,anon;
grant execute on function public.bootstrap_owner_credential(text,text) to authenticated;

create or replace function public.owner_credential_configured()
returns boolean language sql stable security invoker set search_path=public,private as $$
 select private.is_owner_discord_user() and exists(select 1 from public.privileged_portal_credentials where portal_kind='owner' and is_active=true);
$$;
revoke all on function public.owner_credential_configured() from public,anon;
grant execute on function public.owner_credential_configured() to authenticated;

create or replace function private.owner_create_admin_credential_internal(requested_handle text,requested_password text,target_discord_user_id text)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare new_id uuid;
begin
 if not private.is_owner_discord_user() then raise exception 'Owner Discord identity required'; end if;
 if not private.has_privileged_portal_session_internal('owner') then raise exception 'Owner portal sign-in required'; end if;
 if lower(trim(requested_handle)) !~ '^[a-z0-9_]{3,32}$' then raise exception 'Administrator handle is invalid'; end if;
 if length(requested_password)<12 then raise exception 'Administrator password must be at least 12 characters'; end if;
 if target_discord_user_id !~ '^[0-9]{16,22}$' then raise exception 'A valid Discord user ID is required'; end if;
 insert into public.privileged_portal_credentials(portal_kind,handle,password_hash,bound_discord_user_id)
 values('administrator',lower(trim(requested_handle)),crypt(requested_password,gen_salt('bf',12)),target_discord_user_id)
 returning id into new_id;
 return new_id;
end;$$;
revoke all on function private.owner_create_admin_credential_internal(text,text,text) from public,anon;
grant execute on function private.owner_create_admin_credential_internal(text,text,text) to authenticated;

create or replace function public.owner_create_admin_credential(requested_handle text,requested_password text,target_discord_user_id text)
returns uuid language sql security invoker set search_path=private as $$ select private.owner_create_admin_credential_internal(requested_handle,requested_password,target_discord_user_id); $$;
revoke all on function public.owner_create_admin_credential(text,text,text) from public,anon;
grant execute on function public.owner_create_admin_credential(text,text,text) to authenticated;
