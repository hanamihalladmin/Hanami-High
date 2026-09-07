update public.published_character_profiles p
set display_name = coalesce(
      nullif(trim(c.display_name), ''),
      nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
      'Hanami Student'
    ),
    handle = c.handle,
    school_role = c.school_role
from public.characters c
where c.id = p.character_id
  and (p.display_name is null or p.handle is distinct from c.handle or p.school_role is distinct from c.school_role);
