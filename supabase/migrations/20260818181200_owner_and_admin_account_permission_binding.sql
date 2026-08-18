insert into public.account_permissions(user_id,permission,granted_by)
select u.id,'site_admin',u.id from auth.users u
where coalesce(u.raw_user_meta_data->>'provider_id',u.raw_user_meta_data->>'sub')=(select value from public.portal_authorization_config where key='owner_discord_user_id')
and not exists(select 1 from public.account_permissions p where p.user_id=u.id and p.permission='site_admin');

create or replace function private.owner_create_admin_credential_internal(requested_handle text,requested_password text,target_discord_user_id text)
returns uuid language plpgsql security definer set search_path=public,private,auth as $$
declare new_id uuid; target_user uuid;
begin
 if not private.is_owner_discord_user() then raise exception 'Owner Discord identity required'; end if;
 if not private.has_privileged_portal_session_internal('owner') then raise exception 'Owner portal sign-in required'; end if;
 if lower(trim(requested_handle)) !~ '^[a-z0-9_]{3,32}$' then raise exception 'Administrator handle is invalid'; end if;
 if length(requested_password)<12 then raise exception 'Administrator password must be at least 12 characters'; end if;
 if target_discord_user_id !~ '^[0-9]{16,22}$' then raise exception 'A valid Discord user ID is required'; end if;
 select u.id into target_user from auth.users u where coalesce(u.raw_user_meta_data->>'provider_id',u.raw_user_meta_data->>'sub')=target_discord_user_id limit 1;
 if target_user is null then raise exception 'That Discord user must sign in to Hanami once before Administrator access can be provisioned'; end if;
 insert into public.privileged_portal_credentials(portal_kind,handle,password_hash,bound_discord_user_id)
 values('administrator',lower(trim(requested_handle)),crypt(requested_password,gen_salt('bf',12)),target_discord_user_id)
 returning id into new_id;
 insert into public.account_permissions(user_id,permission,granted_by)
 values(target_user,'site_admin',auth.uid())
 on conflict do nothing;
 return new_id;
end;$$;
