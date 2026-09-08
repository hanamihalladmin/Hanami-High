begin;

create table public.character_profile_scenes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  scene_kind text not null check (scene_kind in ('music-room','photo-wall','journal','gaming-room','portfolio','friends-page','seasonal-room')),
  title text not null check (length(title) between 1 and 60),
  description text check (description is null or length(description) <= 240),
  visibility text not null default 'inherit' check (visibility in ('inherit','friends','private')),
  layout_style text not null default 'room' check (layout_style in ('room','gallery','notebook','desktop','showcase','scrapbook','seasonal')),
  background_url text,
  accent_color text not null default '#d39aae' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  settings jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  sort_order smallint not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,scene_kind)
);

create table public.character_profile_scene_items (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.character_profile_scenes(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  item_kind text not null default 'note' check (item_kind in ('note','image','sticker','link','playlist','track','photo','journal-card','game-card','project-card','friend-card','seasonal-decoration','counter','button')),
  title text check (title is null or length(title) <= 80),
  body text check (body is null or length(body) <= 4000),
  asset_url text,
  target_url text,
  position_x numeric(6,2) not null default 8 check (position_x between 0 and 100),
  position_y numeric(6,2) not null default 8 check (position_y between 0 and 100),
  width_pct numeric(6,2) not null default 24 check (width_pct between 6 and 100),
  height_pct numeric(6,2) not null default 20 check (height_pct between 6 and 100),
  rotation_deg numeric(6,2) not null default 0 check (rotation_deg between -30 and 30),
  z_index integer not null default 1,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_profile_scenes_character_idx on public.character_profile_scenes(character_id,is_published,sort_order);
create index character_profile_scene_items_scene_idx on public.character_profile_scene_items(scene_id,z_index,created_at);

create trigger character_profile_scenes_touch_updated_at before update on public.character_profile_scenes for each row execute function private.touch_updated_at();
create trigger character_profile_scene_items_touch_updated_at before update on public.character_profile_scene_items for each row execute function private.touch_updated_at();

create or replace function private.is_current_character_friend(p_character_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.accounts a
    join public.friendships f on f.status='accepted'
    where a.id=(select auth.uid())
      and a.active_character_id is not null
      and (
        (f.requester_character_id=p_character_id and f.addressee_character_id=a.active_character_id)
        or (f.addressee_character_id=p_character_id and f.requester_character_id=a.active_character_id)
      )
  );
$$;

create or replace function private.can_view_profile_scene(p_scene_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.character_profile_scenes s
    join public.characters c on c.id=s.character_id
    where s.id=p_scene_id
      and (
        c.account_id=(select auth.uid())
        or (
          s.is_published=true
          and private.can_view_character_interactive_profile(s.character_id)
          and (
            s.visibility='inherit'
            or (s.visibility='friends' and private.is_current_character_friend(s.character_id))
          )
        )
      )
  );
$$;

alter table public.character_profile_scenes enable row level security;
alter table public.character_profile_scene_items enable row level security;

create policy character_profile_scenes_read on public.character_profile_scenes
for select to authenticated using (private.can_view_profile_scene(id));

create policy character_profile_scenes_plus_insert on public.character_profile_scenes
for insert to authenticated with check (private.can_edit_character_plus_profile(character_id));

create policy character_profile_scenes_plus_update on public.character_profile_scenes
for update to authenticated using (private.can_edit_character_plus_profile(character_id)) with check (private.can_edit_character_plus_profile(character_id));

create policy character_profile_scenes_plus_delete on public.character_profile_scenes
for delete to authenticated using (private.can_edit_character_plus_profile(character_id));

create policy character_profile_scene_items_read on public.character_profile_scene_items
for select to authenticated using (private.can_view_profile_scene(scene_id));

create policy character_profile_scene_items_plus_insert on public.character_profile_scene_items
for insert to authenticated with check (
  private.can_edit_character_plus_profile(character_id)
  and exists(select 1 from public.character_profile_scenes s where s.id=scene_id and s.character_id=character_id)
);

create policy character_profile_scene_items_plus_update on public.character_profile_scene_items
for update to authenticated using (private.can_edit_character_plus_profile(character_id)) with check (
  private.can_edit_character_plus_profile(character_id)
  and exists(select 1 from public.character_profile_scenes s where s.id=scene_id and s.character_id=character_id)
);

create policy character_profile_scene_items_plus_delete on public.character_profile_scene_items
for delete to authenticated using (private.can_edit_character_plus_profile(character_id));

revoke all on public.character_profile_scenes,public.character_profile_scene_items from anon;
grant select,insert,update,delete on public.character_profile_scenes to authenticated;
grant select,insert,update,delete on public.character_profile_scene_items to authenticated;

create or replace function public.ensure_my_profile_scenes(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_profile(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;

  insert into public.character_profile_scenes(character_id,scene_kind,title,description,visibility,layout_style,sort_order)
  values
    (p_character_id,'music-room','Music Room','Songs, playlists, favorite records, and music-themed decorations.','inherit','room',10),
    (p_character_id,'photo-wall','Photo Wall','A scrapbook-like wall for photos, memories, and visual keepsakes.','inherit','gallery',20),
    (p_character_id,'journal','Journal','A quieter notebook-style room for entries, thoughts, and character notes.','inherit','notebook',30),
    (p_character_id,'gaming-room','Gaming Room','Games, consoles, favorites, scores, and playful profile widgets.','inherit','desktop',40),
    (p_character_id,'portfolio','Portfolio','A showcase for art, writing, projects, clubs, and character accomplishments.','inherit','showcase',50),
    (p_character_id,'friends-page','Friends Page','A friends-focused room that can be kept to accepted Hanami friends.','friends','scrapbook',60),
    (p_character_id,'seasonal-room','Seasonal Room','A rotating room for Hanami seasons, festivals, holidays, and school events.','inherit','seasonal',70)
  on conflict(character_id,scene_kind) do nothing;
  return true;
end;
$$;

revoke all on function public.ensure_my_profile_scenes(uuid) from public,anon;
grant execute on function public.ensure_my_profile_scenes(uuid) to authenticated;

commit;
