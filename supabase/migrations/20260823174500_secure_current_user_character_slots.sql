create or replace function public.current_user_character_slots()
returns table(
  id uuid,
  slot smallint,
  role public.character_role,
  display_name text,
  handle text,
  visibility public.profile_visibility,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id,c.slot,c.role,c.display_name,c.handle,c.visibility,c.is_active
  from public.characters c
  where c.owner_user_id = auth.uid()
  order by c.slot asc;
$$;

revoke all on function public.current_user_character_slots() from public;
grant execute on function public.current_user_character_slots() to authenticated;
