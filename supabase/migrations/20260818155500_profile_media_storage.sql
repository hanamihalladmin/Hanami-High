insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', false, 5242880, array['image/jpeg','image/png','image/gif','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "profile owners upload media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and exists (
    select 1 from public.characters c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "profile owners read media"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-media'
  and exists (
    select 1 from public.characters c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "profile owners delete media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and exists (
    select 1 from public.characters c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_user_id = (select auth.uid())
  )
);

create or replace function private.can_view_character_profile_internal(
  viewer_character_id uuid,
  target_character_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.characters viewer
    join public.characters target on target.id = target_character_id
    where viewer.id = viewer_character_id
      and viewer.owner_user_id = auth.uid()
      and (
        target.owner_user_id = auth.uid()
        or target.visibility = 'public'
        or (
          target.visibility = 'friends_only'
          and private.characters_are_friends(viewer_character_id, target_character_id)
        )
      )
  );
$$;

revoke all on function private.can_view_character_profile_internal(uuid, uuid) from public, anon;
grant execute on function private.can_view_character_profile_internal(uuid, uuid) to authenticated;

create or replace function public.can_view_character_profile(
  viewer_character_id uuid,
  target_character_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.can_view_character_profile_internal(viewer_character_id, target_character_id);
$$;

revoke all on function public.can_view_character_profile(uuid, uuid) from public, anon;
grant execute on function public.can_view_character_profile(uuid, uuid) to authenticated;
