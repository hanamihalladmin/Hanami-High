alter table public.character_presence drop constraint character_presence_status_check;
alter table public.character_presence add constraint character_presence_status_check
check (status in ('online','idle','away','dnd','invisible'));

create table public.boutique_wishlist (
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.boutique_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id,item_id)
);
create index boutique_wishlist_item_idx on public.boutique_wishlist(item_id);
alter table public.boutique_wishlist enable row level security;
revoke all on public.boutique_wishlist from anon,authenticated;
grant select,insert,delete on public.boutique_wishlist to authenticated;
create policy boutique_wishlist_select_own on public.boutique_wishlist for select to authenticated using(account_id=(select auth.uid()));
create policy boutique_wishlist_insert_own on public.boutique_wishlist for insert to authenticated with check(account_id=(select auth.uid()));
create policy boutique_wishlist_delete_own on public.boutique_wishlist for delete to authenticated using(account_id=(select auth.uid()));

create table public.character_cosmetic_loadouts (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  avatar_decoration_item_id uuid references public.boutique_items(id) on delete set null,
  frame_item_id uuid references public.boutique_items(id) on delete set null,
  effect_item_id uuid references public.boutique_items(id) on delete set null,
  nameplate_item_id uuid references public.boutique_items(id) on delete set null,
  profile_card_item_id uuid references public.boutique_items(id) on delete set null,
  background_pack_item_id uuid references public.boutique_items(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index character_cosmetic_loadouts_account_idx on public.character_cosmetic_loadouts(account_id,character_id);
create index character_cosmetic_loadouts_avatar_idx on public.character_cosmetic_loadouts(avatar_decoration_item_id) where avatar_decoration_item_id is not null;
create index character_cosmetic_loadouts_frame_idx on public.character_cosmetic_loadouts(frame_item_id) where frame_item_id is not null;
create index character_cosmetic_loadouts_effect_idx on public.character_cosmetic_loadouts(effect_item_id) where effect_item_id is not null;
create index character_cosmetic_loadouts_nameplate_idx on public.character_cosmetic_loadouts(nameplate_item_id) where nameplate_item_id is not null;
create index character_cosmetic_loadouts_profile_card_idx on public.character_cosmetic_loadouts(profile_card_item_id) where profile_card_item_id is not null;
create index character_cosmetic_loadouts_background_idx on public.character_cosmetic_loadouts(background_pack_item_id) where background_pack_item_id is not null;
create trigger character_cosmetic_loadouts_touch_updated_at before update on public.character_cosmetic_loadouts for each row execute function private.touch_updated_at();

create or replace function private.validate_character_cosmetic_loadout()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.characters c where c.id=new.character_id and c.account_id=new.account_id) then raise exception 'Cosmetic loadout ownership mismatch' using errcode='23514'; end if;
  if tg_op='UPDATE' and (new.character_id<>old.character_id or new.account_id<>old.account_id) then raise exception 'Cosmetic loadout identity cannot be changed' using errcode='23514'; end if;
  if new.avatar_decoration_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.avatar_decoration_item_id and b.item_type='avatar_decoration') then raise exception 'Avatar decoration must be owned by the account' using errcode='23514'; end if;
  if new.frame_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.frame_item_id and b.item_type='frame') then raise exception 'Frame must be owned by the account' using errcode='23514'; end if;
  if new.effect_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.effect_item_id and b.item_type='effect') then raise exception 'Effect must be owned by the account' using errcode='23514'; end if;
  if new.nameplate_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.nameplate_item_id and b.item_type='nameplate') then raise exception 'Nameplate must be owned by the account' using errcode='23514'; end if;
  if new.profile_card_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.profile_card_item_id and b.item_type='profile_card') then raise exception 'Profile card must be owned by the account' using errcode='23514'; end if;
  if new.background_pack_item_id is not null and not exists(select 1 from public.inventory_items i join public.boutique_items b on b.id=i.item_id where i.account_id=new.account_id and b.id=new.background_pack_item_id and b.item_type='background_pack') then raise exception 'Background pack must be owned by the account' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function private.validate_character_cosmetic_loadout() from public,anon,authenticated;
create trigger character_cosmetic_loadouts_validate before insert or update on public.character_cosmetic_loadouts for each row execute function private.validate_character_cosmetic_loadout();
alter table public.character_cosmetic_loadouts enable row level security;
revoke all on public.character_cosmetic_loadouts from anon,authenticated;
grant select,insert,update,delete on public.character_cosmetic_loadouts to authenticated;
create policy character_cosmetic_loadouts_select_own on public.character_cosmetic_loadouts for select to authenticated using(account_id=(select auth.uid()));
create policy character_cosmetic_loadouts_insert_own on public.character_cosmetic_loadouts for insert to authenticated with check(account_id=(select auth.uid()));
create policy character_cosmetic_loadouts_update_own on public.character_cosmetic_loadouts for update to authenticated using(account_id=(select auth.uid())) with check(account_id=(select auth.uid()));
create policy character_cosmetic_loadouts_delete_own on public.character_cosmetic_loadouts for delete to authenticated using(account_id=(select auth.uid()));

alter table public.published_character_profiles add column cosmetics jsonb not null default '{}'::jsonb;

create or replace function public.publish_character_profile(p_character_id uuid)
returns timestamptz language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_profile public.character_profiles%rowtype;
  v_character public.characters%rowtype;
  v_published_at timestamptz := now();
  v_display_name text;
  v_cosmetics jsonb := '{}'::jsonb;
begin
  select * into v_profile from public.character_profiles where character_id=p_character_id;
  if not found then raise exception 'Profile not found or not owned by current account.'; end if;
  select * into v_character from public.characters where id=p_character_id and account_id=(select auth.uid());
  if not found then raise exception 'Character not found or not owned by current account.'; end if;
  v_display_name := coalesce(nullif(trim(v_character.display_name),''),nullif(trim(concat_ws(' ',v_character.first_name,v_character.last_name)),''),'Hanami Student');
  select jsonb_strip_nulls(jsonb_build_object(
    'avatarDecoration',(select b.slug from public.boutique_items b where b.id=l.avatar_decoration_item_id),
    'frame',(select b.slug from public.boutique_items b where b.id=l.frame_item_id),
    'effect',(select b.slug from public.boutique_items b where b.id=l.effect_item_id),
    'nameplate',(select b.slug from public.boutique_items b where b.id=l.nameplate_item_id),
    'profileCard',(select b.slug from public.boutique_items b where b.id=l.profile_card_item_id),
    'backgroundPack',(select b.slug from public.boutique_items b where b.id=l.background_pack_item_id)
  )) into v_cosmetics from public.character_cosmetic_loadouts l where l.character_id=p_character_id;
  v_cosmetics := coalesce(v_cosmetics,'{}'::jsonb);
  insert into public.published_character_profiles(character_id,avatar_path,banner_path,bio,custom_status,pronouns,profile_visibility,guestbook_visibility,theme,published_at,display_name,handle,school_role,cosmetics)
  values(p_character_id,v_profile.avatar_path,v_profile.banner_path,v_profile.bio,v_profile.custom_status,v_profile.pronouns,v_profile.profile_visibility,v_profile.guestbook_visibility,v_profile.theme_draft,v_published_at,v_display_name,v_character.handle,v_character.school_role,v_cosmetics)
  on conflict(character_id) do update set avatar_path=excluded.avatar_path,banner_path=excluded.banner_path,bio=excluded.bio,custom_status=excluded.custom_status,pronouns=excluded.pronouns,profile_visibility=excluded.profile_visibility,guestbook_visibility=excluded.guestbook_visibility,theme=excluded.theme,published_at=excluded.published_at,display_name=excluded.display_name,handle=excluded.handle,school_role=excluded.school_role,cosmetics=excluded.cosmetics;
  delete from public.published_profile_widgets where character_id=p_character_id;
  insert into public.published_profile_widgets(id,character_id,widget_type,title,config,x,y,width,height,z_index,published_at)
  select w.id,w.character_id,w.widget_type,w.title,w.config,w.x,w.y,w.width,w.height,w.z_index,v_published_at from public.profile_widgets w where w.character_id=p_character_id and w.is_visible;
  update public.character_profiles set theme_published=theme_draft,published_at=v_published_at,updated_at=v_published_at where character_id=p_character_id;
  return v_published_at;
end;
$$;
