drop policy if exists "students read own hall passes" on public.hall_passes;
drop policy if exists "faculty manage hall passes" on public.hall_passes;

create policy "authorized users read hall passes"
on public.hall_passes
for select
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = hall_passes.student_character_id
      and c.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.characters c
    where c.owner_user_id = auth.uid()
      and c.role = 'faculty'::character_role
  )
  or private.account_has_permission(auth.uid(), 'site_admin'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'content_editor'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'moderator'::hanami_account_permission)
  or private.is_owner_discord_user()
);

create policy "faculty and administration manage hall passes"
on public.hall_passes
for update
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.owner_user_id = auth.uid()
      and c.role = 'faculty'::character_role
  )
  or private.account_has_permission(auth.uid(), 'site_admin'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'content_editor'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'moderator'::hanami_account_permission)
  or private.is_owner_discord_user()
)
with check (
  exists (
    select 1 from public.characters c
    where c.owner_user_id = auth.uid()
      and c.role = 'faculty'::character_role
  )
  or private.account_has_permission(auth.uid(), 'site_admin'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'content_editor'::hanami_account_permission)
  or private.account_has_permission(auth.uid(), 'moderator'::hanami_account_permission)
  or private.is_owner_discord_user()
);
