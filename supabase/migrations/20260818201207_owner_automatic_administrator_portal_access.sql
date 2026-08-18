create or replace function private.has_privileged_portal_session_internal(requested_portal text)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when requested_portal = 'administrator' and private.is_owner_discord_user() then true
    else exists(
      select 1
      from public.privileged_portal_sessions s
      where s.user_id = auth.uid()
        and s.portal_kind = requested_portal
        and s.expires_at > now()
    )
  end;
$$;

revoke all on function private.has_privileged_portal_session_internal(text) from public, anon, authenticated;
