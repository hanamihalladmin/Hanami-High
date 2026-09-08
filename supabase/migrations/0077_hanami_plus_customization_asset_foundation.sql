begin;

create table public.customization_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  asset_type text not null check (asset_type in ('font','tag_style','sticker','emoji','divider','icon','font_effect','decorative_accent')),
  collection_name text not null default 'Hanami Essentials',
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','epic','special','seasonal','hanami_plus','limited')),
  access_kind text not null default 'hanami_plus' check (access_kind in ('standard','hanami_plus','boutique','event','loyalty','creator')),
  boutique_item_id uuid references public.boutique_items(id) on delete set null,
  animated boolean not null default false,
  asset_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(asset_payload)='object'),
  state text not null default 'draft' check (state in ('draft','published','hidden','retired')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(slug)) between 2 and 80),
  check (length(trim(name)) between 2 and 100),
  check (length(description) <= 500),
  check ((access_kind='boutique' and boutique_item_id is not null) or access_kind<>'boutique')
);

create table public.account_customization_asset_grants (
  account_id uuid not null references public.accounts(id) on delete cascade,
  asset_id uuid not null references public.customization_assets(id) on delete cascade,
  source_kind text not null check (source_kind in ('event','achievement','owner','promo','creator','loyalty','migration')),
  source_reference text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  primary key(account_id,asset_id),
  check (expires_at is null or expires_at > granted_at)
);

create table public.account_customization_asset_favorites (
  account_id uuid not null references public.accounts(id) on delete cascade,
  asset_id uuid not null references public.customization_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(account_id,asset_id)
);

create table public.character_custom_tags (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 24),
  style_asset_id uuid references public.customization_assets(id) on delete set null,
  font_asset_id uuid references public.customization_assets(id) on delete set null,
  left_accent_asset_id uuid references public.customization_assets(id) on delete set null,
  right_accent_asset_id uuid references public.customization_assets(id) on delete set null,
  shape text not null default 'pill' check (shape in ('pill','ribbon','plaque','bubble','lace','heart','label')),
  fill_mode text not null default 'solid' check (fill_mode in ('solid','gradient','transparent')),
  background_color text not null default '#f8e4eb' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color_2 text not null default '#fff9f2' check (background_color_2 ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#49333f' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  border_color text not null default '#d39aae' check (border_color ~ '^#[0-9A-Fa-f]{6}$'),
  glow_color text check (glow_color is null or glow_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_shadow boolean not null default false,
  glow_enabled boolean not null default false,
  outline_enabled boolean not null default true,
  motion_style text not null default 'none' check (motion_style in ('none','shimmer','sparkle','pulse','float')),
  visible boolean not null default true,
  is_active boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (position(E'\n' in label)=0 and position(E'\r' in label)=0)
);

create table public.character_font_preferences (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  display_name_font_asset_id uuid references public.customization_assets(id) on delete set null,
  tag_font_asset_id uuid references public.customization_assets(id) on delete set null,
  profile_heading_font_asset_id uuid references public.customization_assets(id) on delete set null,
  profile_body_font_asset_id uuid references public.customization_assets(id) on delete set null,
  blog_font_asset_id uuid references public.customization_assets(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.account_font_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  sitewide_enabled boolean not null default false,
  ui_body_font_asset_id uuid references public.customization_assets(id) on delete set null,
  ui_heading_font_asset_id uuid references public.customization_assets(id) on delete set null,
  ui_display_font_asset_id uuid references public.customization_assets(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index customization_assets_browse_idx on public.customization_assets(state,asset_type,access_kind,sort_order,name);
create index customization_assets_boutique_idx on public.customization_assets(boutique_item_id) where boutique_item_id is not null;
create index account_customization_asset_grants_asset_idx on public.account_customization_asset_grants(asset_id,account_id);
create index character_custom_tags_character_idx on public.character_custom_tags(character_id,sort_order,created_at);
create unique index character_custom_tags_one_active_idx on public.character_custom_tags(character_id) where is_active;
create index character_custom_tags_public_idx on public.character_custom_tags(character_id,visible,is_active);
create index character_font_preferences_account_idx on public.character_font_preferences(account_id,character_id);

create trigger customization_assets_touch_updated_at before update on public.customization_assets for each row execute function private.touch_updated_at();
create trigger character_custom_tags_touch_updated_at before update on public.character_custom_tags for each row execute function private.touch_updated_at();
create trigger character_font_preferences_touch_updated_at before update on public.character_font_preferences for each row execute function private.touch_updated_at();
create trigger account_font_preferences_touch_updated_at before update on public.account_font_preferences for each row execute function private.touch_updated_at();

create or replace function private.account_can_use_customization_asset(p_account_id uuid,p_asset_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.customization_assets a
    where a.id=p_asset_id
      and a.state='published'
      and (
        a.access_kind='standard'
        or (a.access_kind='hanami_plus' and private.has_active_plus_for_account(p_account_id))
        or (a.access_kind='boutique' and exists(
          select 1 from public.inventory_items i
          where i.account_id=p_account_id and i.item_id=a.boutique_item_id
        ))
        or exists(
          select 1 from public.account_customization_asset_grants g
          where g.account_id=p_account_id and g.asset_id=a.id
            and (g.expires_at is null or g.expires_at>now())
        )
      )
  );
$$;
revoke all on function private.account_can_use_customization_asset(uuid,uuid) from public,anon,authenticated;

create or replace function private.validate_character_custom_tag()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_type text;
  v_count integer;
begin
  if not exists(select 1 from public.characters c where c.id=new.character_id and c.account_id=new.account_id) then
    raise exception 'Character tag ownership mismatch' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.character_id<>old.character_id or new.account_id<>old.account_id) then
    raise exception 'Character tag identity cannot be changed' using errcode='23514';
  end if;
  if not private.has_active_plus_for_account(new.account_id) then
    raise exception 'Active Hanami+ required to edit custom tags' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    select count(*) into v_count from public.character_custom_tags t where t.character_id=new.character_id;
    if v_count>=10 then raise exception 'A character can save up to 10 custom tags' using errcode='23514'; end if;
  end if;
  if new.style_asset_id is not null then
    select asset_type into v_type from public.customization_assets where id=new.style_asset_id;
    if v_type<>'tag_style' or not private.account_can_use_customization_asset(new.account_id,new.style_asset_id) then raise exception 'Tag style is not available to this account' using errcode='42501'; end if;
  end if;
  if new.font_asset_id is not null then
    select asset_type into v_type from public.customization_assets where id=new.font_asset_id;
    if v_type<>'font' or not private.account_can_use_customization_asset(new.account_id,new.font_asset_id) then raise exception 'Tag font is not available to this account' using errcode='42501'; end if;
  end if;
  if new.left_accent_asset_id is not null then
    select asset_type into v_type from public.customization_assets where id=new.left_accent_asset_id;
    if v_type not in ('icon','sticker','emoji','decorative_accent') or not private.account_can_use_customization_asset(new.account_id,new.left_accent_asset_id) then raise exception 'Left tag accent is not available to this account' using errcode='42501'; end if;
  end if;
  if new.right_accent_asset_id is not null then
    select asset_type into v_type from public.customization_assets where id=new.right_accent_asset_id;
    if v_type not in ('icon','sticker','emoji','decorative_accent') or not private.account_can_use_customization_asset(new.account_id,new.right_accent_asset_id) then raise exception 'Right tag accent is not available to this account' using errcode='42501'; end if;
  end if;
  if new.motion_style<>'none' and not private.has_active_plus_for_account(new.account_id) then raise exception 'Animated tags require active Hanami+' using errcode='42501'; end if;
  new.label:=trim(new.label);
  return new;
end;
$$;
revoke all on function private.validate_character_custom_tag() from public,anon,authenticated;
create trigger character_custom_tags_validate before insert or update on public.character_custom_tags for each row execute function private.validate_character_custom_tag();

create or replace function private.validate_character_font_preferences()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_asset uuid; v_type text;
begin
  if not exists(select 1 from public.characters c where c.id=new.character_id and c.account_id=new.account_id) then raise exception 'Character font preference ownership mismatch' using errcode='23514'; end if;
  if tg_op='UPDATE' and (new.character_id<>old.character_id or new.account_id<>old.account_id) then raise exception 'Character font preference identity cannot be changed' using errcode='23514'; end if;
  if not private.has_active_plus_for_account(new.account_id) then raise exception 'Active Hanami+ required to edit premium fonts' using errcode='42501'; end if;
  foreach v_asset in array array[new.display_name_font_asset_id,new.tag_font_asset_id,new.profile_heading_font_asset_id,new.profile_body_font_asset_id,new.blog_font_asset_id] loop
    if v_asset is not null then
      select asset_type into v_type from public.customization_assets where id=v_asset;
      if v_type<>'font' or not private.account_can_use_customization_asset(new.account_id,v_asset) then raise exception 'Font is not available to this account' using errcode='42501'; end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.validate_character_font_preferences() from public,anon,authenticated;
create trigger character_font_preferences_validate before insert or update on public.character_font_preferences for each row execute function private.validate_character_font_preferences();

create or replace function private.validate_account_font_preferences()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_asset uuid; v_type text;
begin
  if not private.has_active_plus_for_account(new.account_id) then raise exception 'Active Hanami+ required to edit site-wide fonts' using errcode='42501'; end if;
  foreach v_asset in array array[new.ui_body_font_asset_id,new.ui_heading_font_asset_id,new.ui_display_font_asset_id] loop
    if v_asset is not null then
      select asset_type into v_type from public.customization_assets where id=v_asset;
      if v_type<>'font' or not private.account_can_use_customization_asset(new.account_id,v_asset) then raise exception 'Font is not available to this account' using errcode='42501'; end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.validate_account_font_preferences() from public,anon,authenticated;
create trigger account_font_preferences_validate before insert or update on public.account_font_preferences for each row execute function private.validate_account_font_preferences();

alter table public.customization_assets enable row level security;
alter table public.account_customization_asset_grants enable row level security;
alter table public.account_customization_asset_favorites enable row level security;
alter table public.character_custom_tags enable row level security;
alter table public.character_font_preferences enable row level security;
alter table public.account_font_preferences enable row level security;

create policy customization_assets_authenticated_read on public.customization_assets for select to authenticated using (state in ('published','hidden') or private.account_has_capability((select auth.uid()),'platform.configure'::extensions.citext));
create policy account_customization_asset_grants_self_read on public.account_customization_asset_grants for select to authenticated using (account_id=(select auth.uid()));
create policy account_customization_asset_favorites_self_select on public.account_customization_asset_favorites for select to authenticated using (account_id=(select auth.uid()));
create policy account_customization_asset_favorites_self_insert on public.account_customization_asset_favorites for insert to authenticated with check (account_id=(select auth.uid()));
create policy account_customization_asset_favorites_self_delete on public.account_customization_asset_favorites for delete to authenticated using (account_id=(select auth.uid()));

create policy character_custom_tags_read on public.character_custom_tags for select to authenticated using (
  account_id=(select auth.uid())
  or (visible and is_active and exists(select 1 from public.published_character_profiles p where p.character_id=character_id))
);
create policy character_custom_tags_plus_insert on public.character_custom_tags for insert to authenticated with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy character_custom_tags_plus_update on public.character_custom_tags for update to authenticated using (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id)) with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy character_custom_tags_self_delete on public.character_custom_tags for delete to authenticated using (account_id=(select auth.uid()));

create policy character_font_preferences_read on public.character_font_preferences for select to authenticated using (
  account_id=(select auth.uid())
  or exists(select 1 from public.published_character_profiles p where p.character_id=character_id)
);
create policy character_font_preferences_plus_insert on public.character_font_preferences for insert to authenticated with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy character_font_preferences_plus_update on public.character_font_preferences for update to authenticated using (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id)) with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy character_font_preferences_self_delete on public.character_font_preferences for delete to authenticated using (account_id=(select auth.uid()));

create policy account_font_preferences_self_read on public.account_font_preferences for select to authenticated using (account_id=(select auth.uid()));
create policy account_font_preferences_plus_insert on public.account_font_preferences for insert to authenticated with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy account_font_preferences_plus_update on public.account_font_preferences for update to authenticated using (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id)) with check (account_id=(select auth.uid()) and private.has_active_plus_for_account(account_id));
create policy account_font_preferences_self_delete on public.account_font_preferences for delete to authenticated using (account_id=(select auth.uid()));

revoke all on public.customization_assets,public.account_customization_asset_grants,public.account_customization_asset_favorites,public.character_custom_tags,public.character_font_preferences,public.account_font_preferences from anon;
grant select on public.customization_assets,public.account_customization_asset_grants to authenticated;
grant select,insert,delete on public.account_customization_asset_favorites to authenticated;
grant select,insert,update,delete on public.character_custom_tags,public.character_font_preferences,public.account_font_preferences to authenticated;

create or replace function public.my_customization_asset_access(p_asset_type text default null)
returns table(
  asset_id uuid,
  slug text,
  name text,
  description text,
  asset_type text,
  collection_name text,
  rarity text,
  access_kind text,
  animated boolean,
  asset_payload jsonb,
  can_use boolean,
  is_favorite boolean
) language sql stable security definer set search_path='' as $$
  select a.id,a.slug,a.name,a.description,a.asset_type,a.collection_name,a.rarity,a.access_kind,a.animated,a.asset_payload,
    private.account_can_use_customization_asset((select auth.uid()),a.id),
    exists(select 1 from public.account_customization_asset_favorites f where f.account_id=(select auth.uid()) and f.asset_id=a.id)
  from public.customization_assets a
  where (select auth.uid()) is not null
    and a.state='published'
    and (p_asset_type is null or a.asset_type=p_asset_type)
  order by a.sort_order,a.collection_name,a.name;
$$;
revoke all on function public.my_customization_asset_access(text) from public,anon;
grant execute on function public.my_customization_asset_access(text) to authenticated;

create or replace function public.ensure_my_customization_foundation(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid());
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.characters c where c.id=p_character_id and c.account_id=v_account) then raise exception 'Character not owned by current account' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  insert into public.character_font_preferences(character_id,account_id) values(p_character_id,v_account) on conflict(character_id) do nothing;
  insert into public.account_font_preferences(account_id) values(v_account) on conflict(account_id) do nothing;
  return true;
end;
$$;
revoke all on function public.ensure_my_customization_foundation(uuid) from public,anon;
grant execute on function public.ensure_my_customization_foundation(uuid) to authenticated;

commit;
