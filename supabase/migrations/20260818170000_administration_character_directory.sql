create or replace function private.administration_character_directory_internal(search_term text default null)
returns table(
  character_id uuid,
  owner_user_id uuid,
  display_name text,
  handle text,
  role public.character_role,
  visibility public.profile_visibility,
  is_active boolean,
  created_at timestamptz,
  open_report_count bigint
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.account_has_permission(auth.uid(), 'moderator') then
    raise exception 'moderator permission required';
  end if;
  return query
  select c.id, c.owner_user_id, c.display_name, c.handle, c.role, c.visibility, c.is_active, c.created_at,
         count(r.id) filter (where r.status in ('open','reviewing')) as open_report_count
  from public.characters c
  left join public.character_reports r on r.target_character_id = c.id
  where search_term is null
     or btrim(search_term) = ''
     or c.handle ilike '%' || btrim(search_term) || '%'
     or c.display_name ilike '%' || btrim(search_term) || '%'
  group by c.id
  order by open_report_count desc, c.created_at desc
  limit 100;
end;
$$;
revoke all on function private.administration_character_directory_internal(text) from public, anon;
grant execute on function private.administration_character_directory_internal(text) to authenticated;

create or replace function public.administration_character_directory(search_term text default null)
returns table(
  character_id uuid,
  owner_user_id uuid,
  display_name text,
  handle text,
  role public.character_role,
  visibility public.profile_visibility,
  is_active boolean,
  created_at timestamptz,
  open_report_count bigint
)
language sql
security invoker
set search_path = public, private
as $$
  select * from private.administration_character_directory_internal(search_term);
$$;
revoke all on function public.administration_character_directory(text) from public, anon;
grant execute on function public.administration_character_directory(text) to authenticated;
