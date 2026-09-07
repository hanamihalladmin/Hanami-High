alter function public.request_friendship(uuid) rename to request_friendship_impl;
alter function public.request_friendship_impl(uuid) set schema private;

alter function public.respond_friendship(uuid, boolean) rename to respond_friendship_impl;
alter function public.respond_friendship_impl(uuid, boolean) set schema private;

alter function public.remove_friendship(uuid) rename to remove_friendship_impl;
alter function public.remove_friendship_impl(uuid) set schema private;

revoke all on function private.request_friendship_impl(uuid) from public, anon, authenticated;
revoke all on function private.respond_friendship_impl(uuid, boolean) from public, anon, authenticated;
revoke all on function private.remove_friendship_impl(uuid) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.request_friendship_impl(uuid) to authenticated;
grant execute on function private.respond_friendship_impl(uuid, boolean) to authenticated;
grant execute on function private.remove_friendship_impl(uuid) to authenticated;

create function public.request_friendship(p_target_character_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.request_friendship_impl(p_target_character_id);
$$;

create function public.respond_friendship(p_friendship_id uuid, p_accept boolean)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.respond_friendship_impl(p_friendship_id, p_accept);
$$;

create function public.remove_friendship(p_friendship_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.remove_friendship_impl(p_friendship_id);
$$;

revoke all on function public.request_friendship(uuid) from public, anon;
revoke all on function public.respond_friendship(uuid, boolean) from public, anon;
revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.request_friendship(uuid) to authenticated;
grant execute on function public.respond_friendship(uuid, boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
