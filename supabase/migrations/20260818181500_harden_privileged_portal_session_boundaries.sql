create policy "deny direct portal authorization config reads"
on public.portal_authorization_config
for select
to authenticated
using (false);

create policy "deny direct privileged credential reads"
on public.privileged_portal_credentials
for select
to authenticated
using (false);

create policy "deny direct privileged session reads"
on public.privileged_portal_sessions
for select
to authenticated
using (false);

create or replace function private.end_privileged_portal_session_internal(requested_portal text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  delete from public.privileged_portal_sessions
  where user_id=auth.uid()
    and portal_kind=requested_portal;
end;
$$;
revoke all on function private.end_privileged_portal_session_internal(text) from public,anon;
grant execute on function private.end_privileged_portal_session_internal(text) to authenticated;

create or replace function public.end_privileged_portal_session(requested_portal text)
returns void
language sql
security invoker
set search_path=private
as $$
  select private.end_privileged_portal_session_internal(requested_portal);
$$;
revoke all on function public.end_privileged_portal_session(text) from public,anon;
grant execute on function public.end_privileged_portal_session(text) to authenticated;
