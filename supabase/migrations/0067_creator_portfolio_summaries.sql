begin;

create or replace function public.creator_portfolio_summary(p_creator_account_id uuid)
returns table(
  account_id uuid,
  creator_slug text,
  display_name text,
  bio text,
  banner_url text,
  avatar_url text,
  primary_character_id uuid,
  follower_count integer,
  published_theme_count integer,
  published_kit_count integer,
  public_collection_count integer,
  remix_count integer,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path='' as $$
declare
  v_profile public.creator_profiles%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;

  select * into v_profile
  from public.creator_profiles cp
  where cp.account_id=p_creator_account_id
    and (cp.account_id=(select auth.uid()) or cp.portfolio_visibility in ('public','unlisted'));

  if v_profile.account_id is null then
    raise exception 'Creator portfolio unavailable' using errcode='P0002';
  end if;

  return query
  select
    v_profile.account_id,
    v_profile.creator_slug,
    v_profile.display_name,
    v_profile.bio,
    v_profile.banner_url,
    v_profile.avatar_url,
    v_profile.primary_character_id,
    (select count(*)::integer from public.creator_follows f where f.creator_account_id=v_profile.account_id),
    (select count(*)::integer from public.creator_theme_listings l where l.author_account_id=v_profile.account_id and l.state='published' and l.visibility in ('public','unlisted')),
    (select count(*)::integer from public.creator_widget_kits k where k.author_account_id=v_profile.account_id and k.state='published' and k.visibility in ('public','unlisted')),
    (select count(*)::integer from public.creator_collections c where c.owner_account_id=v_profile.account_id and c.visibility in ('public','unlisted')),
    (select count(*)::integer
      from public.creator_theme_lineage lin
      join public.creator_theme_listings l on l.id=lin.listing_id
      where l.author_account_id=v_profile.account_id and l.state='published' and l.visibility in ('public','unlisted')),
    v_profile.created_at;
end;
$$;

create or replace function public.list_public_creator_portfolios()
returns table(
  account_id uuid,
  creator_slug text,
  display_name text,
  bio text,
  banner_url text,
  avatar_url text,
  follower_count integer,
  published_theme_count integer,
  published_kit_count integer,
  remix_count integer
)
language sql stable security definer set search_path='' as $$
  select
    cp.account_id,
    cp.creator_slug,
    cp.display_name,
    cp.bio,
    cp.banner_url,
    cp.avatar_url,
    (select count(*)::integer from public.creator_follows f where f.creator_account_id=cp.account_id),
    (select count(*)::integer from public.creator_theme_listings l where l.author_account_id=cp.account_id and l.state='published' and l.visibility in ('public','unlisted')),
    (select count(*)::integer from public.creator_widget_kits k where k.author_account_id=cp.account_id and k.state='published' and k.visibility in ('public','unlisted')),
    (select count(*)::integer from public.creator_theme_lineage lin join public.creator_theme_listings l on l.id=lin.listing_id where l.author_account_id=cp.account_id and l.state='published' and l.visibility in ('public','unlisted'))
  from public.creator_profiles cp
  where cp.portfolio_visibility='public'
  order by
    ((select count(*) from public.creator_theme_listings l where l.author_account_id=cp.account_id and l.state='published' and l.visibility in ('public','unlisted'))
      +(select count(*) from public.creator_widget_kits k where k.author_account_id=cp.account_id and k.state='published' and k.visibility in ('public','unlisted'))) desc,
    cp.display_name;
$$;

revoke all on function public.creator_portfolio_summary(uuid),public.list_public_creator_portfolios() from public,anon;
grant execute on function public.creator_portfolio_summary(uuid),public.list_public_creator_portfolios() to authenticated;

commit;
