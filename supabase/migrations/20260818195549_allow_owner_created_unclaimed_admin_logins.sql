alter table public.privileged_portal_credentials
  add column if not exists claimed_at timestamptz;

create or replace function private.owner_create_admin_credential_internal(
  requested_handle text,
  requested_password text,
  target_discord_user_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  new_id uuid;
  target_user uuid;
  clean_target text := nullif(trim(target_discord_user_id), '');
begin
  if not private.is_owner_discord_user() then
    raise exception 'Owner Discord identity required';
  end if;
  if not private.has_privileged_portal_session_internal('owner') then
    raise exception 'Owner portal sign-in required';
  end if;
  if lower(trim(requested_handle)) !~ '^[a-z0-9._@-]{3,64}$' then
    raise exception 'Administrator handle is invalid';
  end if;
  if length(requested_password) < 12 then
    raise exception 'Administrator password must be at least 12 characters';
  end if;

  if clean_target is not null then
    if clean_target !~ '^[0-9]{16,22}$' then
      raise exception 'A valid Discord user ID is required';
    end if;
    select u.id into target_user
    from auth.users u
    where coalesce(u.raw_user_meta_data->>'provider_id', u.raw_user_meta_data->>'sub') = clean_target
    limit 1;
    if target_user is null then
      raise exception 'That Discord user must sign in to Hanami once before Administrator access can be provisioned';
    end if;
  end if;

  insert into public.privileged_portal_credentials(
    portal_kind, handle, password_hash, bound_discord_user_id, claimed_at
  ) values (
    'administrator',
    lower(trim(requested_handle)),
    extensions.crypt(requested_password, extensions.gen_salt('bf', 12)),
    clean_target,
    case when clean_target is null then null else now() end
  )
  returning id into new_id;

  if target_user is not null then
    insert into public.account_permissions(user_id, permission, granted_by)
    values(target_user, 'site_admin', auth.uid())
    on conflict do nothing;
  end if;

  return new_id;
end;
$$;
revoke all on function private.owner_create_admin_credential_internal(text,text,text) from public, anon;
grant execute on function private.owner_create_admin_credential_internal(text,text,text) to authenticated;

create or replace function public.owner_create_admin_credential(
  requested_handle text,
  requested_password text,
  target_discord_user_id text default null
)
returns uuid
language sql
security invoker
set search_path = private
as $$
  select private.owner_create_admin_credential_internal(requested_handle, requested_password, target_discord_user_id);
$$;
revoke all on function public.owner_create_admin_credential(text,text,text) from public, anon;
grant execute on function public.owner_create_admin_credential(text,text,text) to authenticated;

create or replace function private.verify_privileged_portal_login_internal(
  requested_portal text,
  requested_handle text,
  requested_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  cred public.privileged_portal_credentials;
  discord_id text;
begin
  if requested_portal not in ('administrator','owner') then return false; end if;
  discord_id := private.current_discord_user_id();

  select * into cred
  from public.privileged_portal_credentials
  where portal_kind = requested_portal
    and handle = lower(trim(requested_handle))
    and is_active = true
  limit 1;

  if cred.id is null then return false; end if;
  if extensions.crypt(requested_password, cred.password_hash) <> cred.password_hash then return false; end if;

  if requested_portal = 'owner' then
    if not private.is_owner_discord_user() then return false; end if;
    if cred.bound_discord_user_id is not null and cred.bound_discord_user_id <> discord_id then return false; end if;
  else
    if cred.bound_discord_user_id is null then
      update public.privileged_portal_credentials
      set bound_discord_user_id = discord_id,
          claimed_at = now(),
          updated_at = now()
      where id = cred.id
        and bound_discord_user_id is null;

      if not found then return false; end if;

      insert into public.account_permissions(user_id, permission, granted_by)
      values(auth.uid(), 'site_admin', null)
      on conflict do nothing;
    elsif cred.bound_discord_user_id <> discord_id then
      return false;
    end if;
  end if;

  insert into public.privileged_portal_sessions(user_id, portal_kind, expires_at)
  values(auth.uid(), requested_portal, now() + interval '8 hours')
  on conflict(user_id, portal_kind)
  do update set expires_at = excluded.expires_at, created_at = now();

  return true;
end;
$$;
revoke all on function private.verify_privileged_portal_login_internal(text,text,text) from public, anon;
grant execute on function private.verify_privileged_portal_login_internal(text,text,text) to authenticated;
