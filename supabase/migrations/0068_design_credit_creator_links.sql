begin;

drop function if exists public.profile_design_credits(uuid);

create or replace function public.profile_design_credits(p_character_id uuid)
returns table(
  credit_type text,
  source_id uuid,
  source_title text,
  source_creator text,
  source_creator_account_id uuid,
  version_label text,
  attribution_text text,
  item_count integer,
  applied_at timestamptz
)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_view_character_interactive_profile(p_character_id) then raise exception 'Profile unavailable' using errcode='42501'; end if;

  return query
  select
    'theme'::text,
    s.source_listing_id,
    l.title,
    coalesce(cp.display_name,'Hanami Creator'),
    s.source_author_account_id,
    'v'||v.version_no::text,
    s.attribution_text,
    1,
    s.applied_at
  from public.character_profile_theme_source s
  join public.creator_theme_listings l on l.id=s.source_listing_id
  join public.creator_theme_versions v on v.id=s.source_version_id
  left join public.creator_profiles cp on cp.account_id=s.source_author_account_id
  where s.character_id=p_character_id;

  return query
  select
    'component'::text,
    a.kit_id,
    k.title,
    coalesce(cp.display_name,'Hanami Creator'),
    a.source_author_account_id,
    'v'||kv.version_no::text,
    min(a.attribution_text),
    count(*)::integer,
    min(a.installed_at)
  from public.profile_widget_attribution a
  join public.profile_widgets w on w.id=a.widget_id
  join public.creator_widget_kits k on k.id=a.kit_id
  join public.creator_widget_kit_versions kv on kv.id=a.version_id
  left join public.creator_profiles cp on cp.account_id=a.source_author_account_id
  where w.character_id=p_character_id
  group by a.install_group_id,a.kit_id,k.title,cp.display_name,a.source_author_account_id,kv.version_no
  order by min(a.installed_at);
end;
$$;

revoke all on function public.profile_design_credits(uuid) from public,anon;
grant execute on function public.profile_design_credits(uuid) to authenticated;

commit;
