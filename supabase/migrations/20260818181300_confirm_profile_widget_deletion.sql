create or replace function private.delete_owned_profile_widget_internal(target_widget_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  deleted_count integer;
begin
  delete from public.character_profile_widgets w
  using public.characters c
  where w.id=target_widget_id
    and c.id=w.character_id
    and c.owner_user_id=auth.uid();
  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;
revoke all on function private.delete_owned_profile_widget_internal(uuid) from public,anon;
grant execute on function private.delete_owned_profile_widget_internal(uuid) to authenticated;

create or replace function public.delete_owned_profile_widget(target_widget_id uuid)
returns boolean
language sql
security invoker
set search_path=public,private
as $$
  select private.delete_owned_profile_widget_internal(target_widget_id);
$$;
revoke all on function public.delete_owned_profile_widget(uuid) from public,anon;
grant execute on function public.delete_owned_profile_widget(uuid) to authenticated;
