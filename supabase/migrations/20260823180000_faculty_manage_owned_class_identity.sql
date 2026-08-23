-- Allow faculty to manage the public identity of sections they personally teach.
drop policy if exists "section_identity_instructor_manage" on public.class_section_identity;
create policy "section_identity_instructor_manage"
on public.class_section_identity
for all
to authenticated
using (
  exists (
    select 1
    from public.section_memberships sm
    join public.characters c on c.id = sm.character_id
    where sm.section_id = class_section_identity.section_id
      and sm.relationship::text = 'instructor'
      and c.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.section_memberships sm
    join public.characters c on c.id = sm.character_id
    where sm.section_id = class_section_identity.section_id
      and sm.relationship::text = 'instructor'
      and c.owner_user_id = auth.uid()
  )
);
