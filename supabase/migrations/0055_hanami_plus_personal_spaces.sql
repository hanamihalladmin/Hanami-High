begin;

create table public.character_personal_spaces (
  character_id uuid not null references public.characters(id) on delete cascade,
  space_kind text not null check (space_kind in ('locker','desk','phone','desktop')),
  visibility text not null default 'private' check (visibility in ('private','friends','public')),
  title text,
  theme_key text,
  wallpaper_url text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (character_id, space_kind)
);

create table public.character_space_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  space_kind text not null check (space_kind in ('locker','desk','phone','desktop')),
  item_kind text not null check (item_kind in (
    'sticker','poster','magnet','photo','keychain','note','charm','collectible',
    'desk_object','phone_widget','phone_contact','phone_shortcut','desktop_icon','desktop_widget','shortcut'
  )),
  label text,
  body text,
  asset_url text,
  linked_character_id uuid references public.characters(id) on delete set null,
  target_route text,
  position_x numeric(7,3) not null default 0 check (position_x between 0 and 100),
  position_y numeric(7,3) not null default 0 check (position_y between 0 and 100),
  width_pct numeric(7,3) not null default 20 check (width_pct between 2 and 100),
  height_pct numeric(7,3) not null default 20 check (height_pct between 2 and 100),
  rotation_deg numeric(7,2) not null default 0 check (rotation_deg between -180 and 180),
  z_index integer not null default 0 check (z_index between -1000 and 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_space_items_character_space_idx on public.character_space_items(character_id,space_kind,z_index,created_at);
create index character_space_items_linked_character_idx on public.character_space_items(linked_character_id) where linked_character_id is not null;

create trigger character_personal_spaces_touch_updated_at before update on public.character_personal_spaces for each row execute function private.touch_updated_at();
create trigger character_space_items_touch_updated_at before update on public.character_space_items for each row execute function private.touch_updated_at();

alter table public.character_personal_spaces enable row level security;
alter table public.character_space_items enable row level security;

create or replace function private.can_edit_character_plus_space(p_character_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.characters c
    join public.hanami_plus_entitlements e on e.account_id=c.account_id and e.ends_at>now()
    where c.id=p_character_id and c.account_id=(select auth.uid())
  );
$$;
revoke all on function private.can_edit_character_plus_space(uuid) from public,anon,authenticated;

create policy character_personal_spaces_self_read on public.character_personal_spaces
for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
);
create policy character_personal_spaces_plus_insert on public.character_personal_spaces
for insert to authenticated with check (private.can_edit_character_plus_space(character_id));
create policy character_personal_spaces_plus_update on public.character_personal_spaces
for update to authenticated using (private.can_edit_character_plus_space(character_id)) with check (private.can_edit_character_plus_space(character_id));
create policy character_personal_spaces_plus_delete on public.character_personal_spaces
for delete to authenticated using (private.can_edit_character_plus_space(character_id));

create policy character_space_items_self_read on public.character_space_items
for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
);
create policy character_space_items_plus_insert on public.character_space_items
for insert to authenticated with check (private.can_edit_character_plus_space(character_id));
create policy character_space_items_plus_update on public.character_space_items
for update to authenticated using (private.can_edit_character_plus_space(character_id)) with check (private.can_edit_character_plus_space(character_id));
create policy character_space_items_plus_delete on public.character_space_items
for delete to authenticated using (private.can_edit_character_plus_space(character_id));

revoke all on public.character_personal_spaces from anon;
revoke all on public.character_space_items from anon;
grant select,insert,update,delete on public.character_personal_spaces to authenticated;
grant select,insert,update,delete on public.character_space_items to authenticated;

create or replace function public.ensure_my_character_personal_spaces(p_character_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_space(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;
  insert into public.character_personal_spaces(character_id,space_kind,title,theme_key)
  values
    (p_character_id,'locker','My Locker','school-locker'),
    (p_character_id,'desk','My Desk','study-desk'),
    (p_character_id,'phone','My Phone','flip-phone'),
    (p_character_id,'desktop','My Desktop','hanami-2006')
  on conflict(character_id,space_kind) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.ensure_my_character_personal_spaces(uuid) from public,anon;
grant execute on function public.ensure_my_character_personal_spaces(uuid) to authenticated;

commit;
