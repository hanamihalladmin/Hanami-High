create or replace function private.visible_character_profile_internal(
  viewer_character_id uuid,
  target_handle text
)
returns table (
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role,
  visibility public.profile_visibility,
  headline text,
  bio text,
  status_message text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    target.id,
    target.display_name,
    target.handle,
    target.role,
    target.visibility,
    coalesce(profile.headline, ''),
    coalesce(profile.bio, ''),
    coalesce(profile.status_message, '')
  from public.characters viewer
  join public.characters target on target.handle = lower(trim(leading '@' from target_handle))
  left join public.character_profiles profile on profile.character_id = target.id
  where viewer.id = viewer_character_id
    and viewer.owner_user_id = auth.uid()
    and (
      target.owner_user_id = auth.uid()
      or target.visibility = 'public'
    )
  limit 1;
$$;

revoke all on function private.visible_character_profile_internal(uuid, text) from public, anon;
grant execute on function private.visible_character_profile_internal(uuid, text) to authenticated;

create or replace function public.lookup_visible_character_profile(
  viewer_character_id uuid,
  target_handle text
)
returns table (
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role,
  visibility public.profile_visibility,
  headline text,
  bio text,
  status_message text
)
language sql
stable
security invoker
set search_path = public, private
as $$
  select * from private.visible_character_profile_internal(viewer_character_id, target_handle);
$$;

revoke all on function public.lookup_visible_character_profile(uuid, text) from public, anon;
grant execute on function public.lookup_visible_character_profile(uuid, text) to authenticated;
