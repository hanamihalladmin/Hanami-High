-- Reliable per-character classroom banner updates.
-- Uses narrow SECURITY DEFINER RPCs so clients do not have to upsert the entire
-- character_portal_preferences row just to change one section banner.

create or replace function public.set_my_class_banner_color(
  p_character_id uuid,
  p_section_id uuid,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_colors jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = p_character_id and c.owner_user_id = auth.uid()
  ) then
    raise exception 'Character not owned by current user';
  end if;

  if not exists (
    select 1 from public.section_memberships sm
    where sm.character_id = p_character_id and sm.section_id = p_section_id
  ) then
    raise exception 'Character is not assigned to this class section';
  end if;

  if p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid banner color';
  end if;

  insert into public.character_portal_preferences(character_id, class_banner_colors, updated_at)
  values (p_character_id, jsonb_build_object(p_section_id::text, lower(p_color)), now())
  on conflict (character_id) do update
    set class_banner_colors = coalesce(public.character_portal_preferences.class_banner_colors, '{}'::jsonb)
      || jsonb_build_object(p_section_id::text, lower(p_color)),
        updated_at = now()
  returning class_banner_colors into next_colors;

  return next_colors;
end;
$$;

create or replace function public.set_my_class_banner_image(
  p_character_id uuid,
  p_section_id uuid,
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_images jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = p_character_id and c.owner_user_id = auth.uid()
  ) then
    raise exception 'Character not owned by current user';
  end if;

  if not exists (
    select 1 from public.section_memberships sm
    where sm.character_id = p_character_id and sm.section_id = p_section_id
  ) then
    raise exception 'Character is not assigned to this class section';
  end if;

  insert into public.character_portal_preferences(character_id, class_banner_images, updated_at)
  values (
    p_character_id,
    case when nullif(p_path, '') is null then '{}'::jsonb else jsonb_build_object(p_section_id::text, p_path) end,
    now()
  )
  on conflict (character_id) do update
    set class_banner_images = case
      when nullif(p_path, '') is null then coalesce(public.character_portal_preferences.class_banner_images, '{}'::jsonb) - p_section_id::text
      else coalesce(public.character_portal_preferences.class_banner_images, '{}'::jsonb) || jsonb_build_object(p_section_id::text, p_path)
    end,
    updated_at = now()
  returning class_banner_images into next_images;

  return next_images;
end;
$$;

revoke all on function public.set_my_class_banner_color(uuid, uuid, text) from public;
revoke all on function public.set_my_class_banner_image(uuid, uuid, text) from public;
grant execute on function public.set_my_class_banner_color(uuid, uuid, text) to authenticated;
grant execute on function public.set_my_class_banner_image(uuid, uuid, text) to authenticated;
