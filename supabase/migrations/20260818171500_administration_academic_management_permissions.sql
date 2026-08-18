grant insert, update, delete on public.academic_courses to authenticated;
grant insert, update, delete on public.class_sections to authenticated;
grant insert, update, delete on public.section_meetings to authenticated;
grant insert, update, delete on public.section_memberships to authenticated;

create policy "site admins manage academic courses"
on public.academic_courses for all to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'))
with check (private.account_has_permission((select auth.uid()), 'site_admin'));

create policy "site admins manage class sections"
on public.class_sections for all to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'))
with check (private.account_has_permission((select auth.uid()), 'site_admin'));

create policy "site admins manage section meetings"
on public.section_meetings for all to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'))
with check (private.account_has_permission((select auth.uid()), 'site_admin'));

create policy "site admins read all section memberships"
on public.section_memberships for select to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'));

create policy "site admins manage section memberships"
on public.section_memberships for all to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'))
with check (private.account_has_permission((select auth.uid()), 'site_admin'));

create or replace function private.admin_assign_character_to_section_internal(
  target_section_id uuid,
  target_handle text,
  target_relationship public.section_relationship
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_character public.characters%rowtype;
  membership_id uuid;
begin
  if not private.account_has_permission(auth.uid(), 'site_admin') then
    raise exception 'site admin permission required';
  end if;

  select * into target_character
  from public.characters
  where handle = lower(btrim(target_handle));

  if target_character.id is null then
    raise exception 'character not found';
  end if;

  if target_relationship = 'student' and target_character.role <> 'student' then
    raise exception 'student membership requires a student character';
  end if;
  if target_relationship = 'instructor' and target_character.role <> 'faculty' then
    raise exception 'instructor membership requires a faculty character';
  end if;

  insert into public.section_memberships(section_id, character_id, relationship)
  values (target_section_id, target_character.id, target_relationship)
  on conflict (section_id, character_id)
  do update set relationship = excluded.relationship
  returning id into membership_id;

  return membership_id;
end;
$$;
revoke all on function private.admin_assign_character_to_section_internal(uuid,text,public.section_relationship) from public, anon;
grant execute on function private.admin_assign_character_to_section_internal(uuid,text,public.section_relationship) to authenticated;

create or replace function public.admin_assign_character_to_section(
  target_section_id uuid,
  target_handle text,
  target_relationship public.section_relationship
)
returns uuid
language sql
security invoker
set search_path = public, private
as $$
  select private.admin_assign_character_to_section_internal(target_section_id,target_handle,target_relationship);
$$;
revoke all on function public.admin_assign_character_to_section(uuid,text,public.section_relationship) from public, anon;
grant execute on function public.admin_assign_character_to_section(uuid,text,public.section_relationship) to authenticated;
