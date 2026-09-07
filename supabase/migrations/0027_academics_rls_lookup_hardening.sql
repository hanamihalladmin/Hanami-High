create or replace function private.academic_account_can_manage_section(p_account_id uuid, p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_account_id is not null and (
    private.account_has_capability(p_account_id, 'school.configure'::extensions.citext)
    or exists (
      select 1
      from public.accounts a
      join public.academic_section_staff s on s.character_id=a.active_character_id
      where a.id=p_account_id and s.section_id=p_section_id
    )
  );
$$;
revoke all on function private.academic_account_can_manage_section(uuid, uuid) from public, anon, authenticated;

create or replace function private.academic_account_is_enrolled(p_account_id uuid, p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_account_id is not null and exists (
    select 1
    from public.accounts a
    join public.academic_enrollments e on e.student_character_id=a.active_character_id
    where a.id=p_account_id and e.section_id=p_section_id and e.status='active'
  );
$$;
revoke all on function private.academic_account_is_enrolled(uuid, uuid) from public, anon, authenticated;

create or replace function public.academic_can_manage_section(p_section_id uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select private.academic_account_can_manage_section((select auth.uid()), p_section_id);
$$;

create or replace function public.academic_is_enrolled(p_section_id uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select private.academic_account_is_enrolled((select auth.uid()), p_section_id);
$$;

grant execute on function private.academic_account_can_manage_section(uuid, uuid) to authenticated;
grant execute on function private.academic_account_is_enrolled(uuid, uuid) to authenticated;
