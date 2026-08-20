begin;

create or replace function public.lookup_visible_character_profile(viewer_character_id uuid,target_handle text)
returns table(character_id uuid,display_name text,handle text,role public.character_role,visibility public.profile_visibility,headline text,bio text,status_message text)
language sql
stable
security definer
set search_path=''
as $$
  select * from private.visible_character_profile_internal(viewer_character_id,target_handle);
$$;

create or replace function public.lookup_visible_profile_design(viewer_character_id uuid,target_handle text)
returns table(canvas jsonb,widgets jsonb)
language sql
stable
security definer
set search_path=''
as $$
  select * from private.visible_profile_design_internal(viewer_character_id,target_handle);
$$;

create or replace function public.lookup_visible_profile_social(viewer_character_id uuid,target_handle text)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select private.visible_profile_social_internal(viewer_character_id,target_handle);
$$;

revoke all on function public.lookup_visible_character_profile(uuid,text) from public;
revoke all on function public.lookup_visible_profile_design(uuid,text) from public;
revoke all on function public.lookup_visible_profile_social(uuid,text) from public;
grant execute on function public.lookup_visible_character_profile(uuid,text) to authenticated;
grant execute on function public.lookup_visible_profile_design(uuid,text) to authenticated;
grant execute on function public.lookup_visible_profile_social(uuid,text) to authenticated;

revoke all on function private.visible_character_profile_internal(uuid,text) from public,anon,authenticated;
revoke all on function private.visible_profile_design_internal(uuid,text) from public,anon,authenticated;
revoke all on function private.visible_profile_social_internal(uuid,text) from public,anon,authenticated;

commit;
