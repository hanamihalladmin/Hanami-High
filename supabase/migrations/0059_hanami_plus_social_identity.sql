begin;

create table public.character_social_identity_customization (
  character_id uuid primary key references public.characters(id) on delete cascade,
  display_name_font text not null default 'default' check (display_name_font in ('default','serif','mono','rounded','handwritten','pixel')),
  display_name_color text not null default '#5f4d59' check (display_name_color ~ '^#[0-9A-Fa-f]{6}$'),
  display_name_effect text not null default 'none' check (display_name_effect in ('none','glow','shadow','sparkle','underline','gradient-shift')),
  status_icon text,
  status_style text not null default 'classic' check (status_style in ('classic','note','pill','pixel','sticker','soft-card')),
  badge_layout text not null default 'row' check (badge_layout in ('row','stack','compact','sticker-board')),
  post_card_style text not null default 'classic' check (post_card_style in ('classic','notebook','scrapbook','pixel','soft-card','letter')),
  guestbook_style text not null default 'classic' check (guestbook_style in ('classic','notebook','polaroid','guestbook','pixel','sticker-book')),
  reaction_pack text not null default 'classic' check (reaction_pack in ('classic','flowers','stars','school','soft','pixel')),
  sticker_pack text not null default 'hanami' check (sticker_pack in ('hanami','school','flowers','doodles','pixel','notebook')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.character_profile_badges (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  badge_kind text not null default 'personal' check (badge_kind in ('personal','club','achievement','creator','event')),
  label text not null check (length(label) between 1 and 28),
  icon text check (icon is null or length(icon) <= 8),
  description text check (description is null or length(description) <= 120),
  sort_order smallint not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.character_friend_groups (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  group_name text not null check (length(group_name) between 1 and 32),
  icon text check (icon is null or length(icon) <= 8),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,group_name)
);

create table public.character_friend_group_members (
  group_id uuid not null references public.character_friend_groups(id) on delete cascade,
  friend_character_id uuid not null references public.characters(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key(group_id,friend_character_id)
);

create table public.social_post_styles (
  post_id uuid primary key references public.social_posts(id) on delete cascade,
  author_character_id uuid not null references public.characters(id) on delete cascade,
  card_style text not null default 'classic' check (card_style in ('classic','notebook','scrapbook','pixel','soft-card','letter')),
  accent_key text not null default 'rose' check (accent_key in ('rose','sage','navy','lavender','bluebell','ivory')),
  title_style text not null default 'default' check (title_style in ('default','serif','mono','handwritten','pixel','underline')),
  sticker_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_profile_badges_character_idx on public.character_profile_badges(character_id,visible,sort_order);
create index character_friend_groups_character_idx on public.character_friend_groups(character_id,sort_order);
create index social_post_styles_author_idx on public.social_post_styles(author_character_id,updated_at desc);

create trigger character_social_identity_customization_touch_updated_at before update on public.character_social_identity_customization for each row execute function private.touch_updated_at();
create trigger character_profile_badges_touch_updated_at before update on public.character_profile_badges for each row execute function private.touch_updated_at();
create trigger character_friend_groups_touch_updated_at before update on public.character_friend_groups for each row execute function private.touch_updated_at();
create trigger social_post_styles_touch_updated_at before update on public.social_post_styles for each row execute function private.touch_updated_at();

alter table public.character_social_identity_customization enable row level security;
alter table public.character_profile_badges enable row level security;
alter table public.character_friend_groups enable row level security;
alter table public.character_friend_group_members enable row level security;
alter table public.social_post_styles enable row level security;

create policy character_social_identity_visible on public.character_social_identity_customization for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
  or exists(select 1 from public.published_character_profiles p where p.character_id=character_id)
);
create policy character_social_identity_plus_insert on public.character_social_identity_customization for insert to authenticated with check (private.can_edit_character_plus_customization(character_id));
create policy character_social_identity_plus_update on public.character_social_identity_customization for update to authenticated using (private.can_edit_character_plus_customization(character_id)) with check (private.can_edit_character_plus_customization(character_id));

create policy character_profile_badges_visible on public.character_profile_badges for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
  or (visible=true and exists(select 1 from public.published_character_profiles p where p.character_id=character_id))
);
create policy character_profile_badges_plus_insert on public.character_profile_badges for insert to authenticated with check (private.can_edit_character_plus_customization(character_id));
create policy character_profile_badges_plus_update on public.character_profile_badges for update to authenticated using (private.can_edit_character_plus_customization(character_id)) with check (private.can_edit_character_plus_customization(character_id));
create policy character_profile_badges_plus_delete on public.character_profile_badges for delete to authenticated using (private.can_edit_character_plus_customization(character_id));

create policy character_friend_groups_self_read on public.character_friend_groups for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy character_friend_groups_plus_insert on public.character_friend_groups for insert to authenticated with check (private.can_edit_character_plus_customization(character_id));
create policy character_friend_groups_plus_update on public.character_friend_groups for update to authenticated using (private.can_edit_character_plus_customization(character_id)) with check (private.can_edit_character_plus_customization(character_id));
create policy character_friend_groups_plus_delete on public.character_friend_groups for delete to authenticated using (private.can_edit_character_plus_customization(character_id));

create policy character_friend_group_members_self_read on public.character_friend_group_members for select to authenticated using (exists(select 1 from public.character_friend_groups g join public.characters c on c.id=g.character_id where g.id=group_id and c.account_id=(select auth.uid())));
create policy character_friend_group_members_plus_insert on public.character_friend_group_members for insert to authenticated with check (exists(select 1 from public.character_friend_groups g where g.id=group_id and private.can_edit_character_plus_customization(g.character_id)) and exists(select 1 from public.friendships f join public.character_friend_groups g on g.id=group_id where f.status='accepted' and ((f.requester_character_id=g.character_id and f.addressee_character_id=friend_character_id) or (f.addressee_character_id=g.character_id and f.requester_character_id=friend_character_id))));
create policy character_friend_group_members_plus_delete on public.character_friend_group_members for delete to authenticated using (exists(select 1 from public.character_friend_groups g where g.id=group_id and private.can_edit_character_plus_customization(g.character_id)));

create policy social_post_styles_visible on public.social_post_styles for select to authenticated using (
  exists(select 1 from public.characters c where c.id=author_character_id and c.account_id=(select auth.uid()))
  or exists(select 1 from public.social_posts p where p.id=post_id and p.author_character_id=author_character_id)
);
create policy social_post_styles_plus_insert on public.social_post_styles for insert to authenticated with check (private.can_edit_character_plus_customization(author_character_id) and exists(select 1 from public.social_posts p where p.id=post_id and p.author_character_id=author_character_id));
create policy social_post_styles_plus_update on public.social_post_styles for update to authenticated using (private.can_edit_character_plus_customization(author_character_id)) with check (private.can_edit_character_plus_customization(author_character_id));
create policy social_post_styles_plus_delete on public.social_post_styles for delete to authenticated using (private.can_edit_character_plus_customization(author_character_id));

revoke all on public.character_social_identity_customization,public.character_profile_badges,public.character_friend_groups,public.character_friend_group_members,public.social_post_styles from anon;
grant select,insert,update on public.character_social_identity_customization to authenticated;
grant select,insert,update,delete on public.character_profile_badges to authenticated;
grant select,insert,update,delete on public.character_friend_groups to authenticated;
grant select,insert,delete on public.character_friend_group_members to authenticated;
grant select,insert,update,delete on public.social_post_styles to authenticated;

create or replace function public.ensure_my_social_identity_customization(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_customization(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;
  insert into public.character_social_identity_customization(character_id) values(p_character_id) on conflict(character_id) do nothing;
  return true;
end;
$$;
revoke all on function public.ensure_my_social_identity_customization(uuid) from public,anon;
grant execute on function public.ensure_my_social_identity_customization(uuid) to authenticated;

commit;
