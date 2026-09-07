insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-media',
  'profile-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_media_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.characters c
    where c.account_id = (select auth.uid())
      and c.id::text = (storage.foldername(name))[2]
  )
);

create policy profile_media_select_visible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.published_character_profiles p
      join public.characters c on c.id = p.character_id
      where c.id::text = (storage.foldername(name))[2]
        and c.account_id::text = (storage.foldername(name))[1]
        and p.profile_visibility = 'hanami'
        and c.character_state = 'active'
    )
  )
);

create policy profile_media_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.characters c
    where c.account_id = (select auth.uid())
      and c.id::text = (storage.foldername(name))[2]
  )
);
