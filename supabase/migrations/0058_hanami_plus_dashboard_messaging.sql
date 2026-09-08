begin;

create table public.character_dashboard_customization (
  character_id uuid primary key references public.characters(id) on delete cascade,
  layout_style text not null default 'classic' check (layout_style in ('classic','balanced','focus','social','compact')),
  theme_key text not null default 'hanami-classic' check (theme_key in ('hanami-classic','sage-study','navy-night','rose-notebook','ivory-campus','pixel-2006')),
  wallpaper_url text,
  widget_visibility jsonb not null default '{"school_id":true,"today":true,"note":true,"schedule":true,"announcement":true,"calendar":true,"petals":true}'::jsonb,
  quick_links jsonb not null default '["#/academics/my-schedule","#/messages/friends","#/profile/view-profile","#/hanami-plus/overview"]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.character_message_customization (
  character_id uuid primary key references public.characters(id) on delete cascade,
  bubble_style text not null default 'classic' check (bubble_style in ('classic','soft','compact','notebook','pixel','rounded-card')),
  message_font text not null default 'system' check (message_font in ('system','serif','mono','rounded','handwritten')),
  accent_key text not null default 'rose' check (accent_key in ('rose','sage','navy','ivory','lavender','bluebell')),
  dm_background_url text,
  timestamp_style text not null default 'compact' check (timestamp_style in ('compact','full','minimal','hidden')),
  message_effect text not null default 'none' check (message_effect in ('none','soft-fade','sparkle-arrival','slide-in')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.conversation_member_organization (
  conversation_id uuid not null,
  character_id uuid not null,
  folder_name text check (folder_name is null or length(folder_name) between 1 and 32),
  pinned boolean not null default false,
  muted boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key(conversation_id,character_id),
  foreign key(conversation_id,character_id) references public.conversation_members(conversation_id,character_id) on delete cascade
);

create table public.account_notification_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  profile_name text not null check (length(profile_name) between 1 and 40),
  notify_messages boolean not null default true,
  notify_social boolean not null default true,
  notify_school boolean not null default true,
  profile_kind text not null default 'custom' check (profile_kind in ('custom','focus','social','school','quiet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,profile_name)
);

create index conversation_member_organization_folder_idx on public.conversation_member_organization(character_id,archived,folder_name,pinned desc,updated_at desc);
create index account_notification_profiles_account_idx on public.account_notification_profiles(account_id,updated_at desc);

create trigger character_dashboard_customization_touch_updated_at before update on public.character_dashboard_customization for each row execute function private.touch_updated_at();
create trigger character_message_customization_touch_updated_at before update on public.character_message_customization for each row execute function private.touch_updated_at();
create trigger conversation_member_organization_touch_updated_at before update on public.conversation_member_organization for each row execute function private.touch_updated_at();
create trigger account_notification_profiles_touch_updated_at before update on public.account_notification_profiles for each row execute function private.touch_updated_at();

create or replace function private.can_edit_character_plus_customization(p_character_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.characters c
    join public.hanami_plus_entitlements e on e.account_id=c.account_id and e.ends_at>now()
    where c.id=p_character_id and c.account_id=(select auth.uid())
  );
$$;
revoke all on function private.can_edit_character_plus_customization(uuid) from public,anon,authenticated;

alter table public.character_dashboard_customization enable row level security;
alter table public.character_message_customization enable row level security;
alter table public.conversation_member_organization enable row level security;
alter table public.account_notification_profiles enable row level security;

create policy character_dashboard_customization_self_read on public.character_dashboard_customization for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy character_dashboard_customization_plus_insert on public.character_dashboard_customization for insert to authenticated with check (private.can_edit_character_plus_customization(character_id));
create policy character_dashboard_customization_plus_update on public.character_dashboard_customization for update to authenticated using (private.can_edit_character_plus_customization(character_id)) with check (private.can_edit_character_plus_customization(character_id));
create policy character_dashboard_customization_plus_delete on public.character_dashboard_customization for delete to authenticated using (private.can_edit_character_plus_customization(character_id));

create policy character_message_customization_self_read on public.character_message_customization for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy character_message_customization_plus_insert on public.character_message_customization for insert to authenticated with check (private.can_edit_character_plus_customization(character_id));
create policy character_message_customization_plus_update on public.character_message_customization for update to authenticated using (private.can_edit_character_plus_customization(character_id)) with check (private.can_edit_character_plus_customization(character_id));
create policy character_message_customization_plus_delete on public.character_message_customization for delete to authenticated using (private.can_edit_character_plus_customization(character_id));

create policy conversation_member_organization_self_read on public.conversation_member_organization for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy conversation_member_organization_self_insert on public.conversation_member_organization for insert to authenticated with check (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy conversation_member_organization_self_update on public.conversation_member_organization for update to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))) with check (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy conversation_member_organization_self_delete on public.conversation_member_organization for delete to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));

create policy account_notification_profiles_self_read on public.account_notification_profiles for select to authenticated using (account_id=(select auth.uid()));
create policy account_notification_profiles_plus_insert on public.account_notification_profiles for insert to authenticated with check (account_id=(select auth.uid()) and private.account_has_active_hanami_plus(account_id));
create policy account_notification_profiles_plus_update on public.account_notification_profiles for update to authenticated using (account_id=(select auth.uid()) and private.account_has_active_hanami_plus(account_id)) with check (account_id=(select auth.uid()));
create policy account_notification_profiles_plus_delete on public.account_notification_profiles for delete to authenticated using (account_id=(select auth.uid()) and private.account_has_active_hanami_plus(account_id));

revoke all on public.character_dashboard_customization,public.character_message_customization,public.conversation_member_organization,public.account_notification_profiles from anon;
grant select,insert,update,delete on public.character_dashboard_customization to authenticated;
grant select,insert,update,delete on public.character_message_customization to authenticated;
grant select,insert,update,delete on public.conversation_member_organization to authenticated;
grant select,insert,update,delete on public.account_notification_profiles to authenticated;

create or replace function public.ensure_my_plus_interface_customization(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_customization(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;
  insert into public.character_dashboard_customization(character_id) values(p_character_id) on conflict(character_id) do nothing;
  insert into public.character_message_customization(character_id) values(p_character_id) on conflict(character_id) do nothing;
  return true;
end;
$$;
revoke all on function public.ensure_my_plus_interface_customization(uuid) from public,anon;
grant execute on function public.ensure_my_plus_interface_customization(uuid) to authenticated;

create or replace function public.apply_notification_profile(p_profile_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_profile public.account_notification_profiles%rowtype;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_profile from public.account_notification_profiles where id=p_profile_id and account_id=v_account;
  if not found then raise exception 'Notification profile unavailable' using errcode='P0002'; end if;
  update public.account_preferences
  set notify_messages=v_profile.notify_messages,
      notify_social=v_profile.notify_social,
      notify_school=v_profile.notify_school,
      updated_at=now()
  where account_id=v_account;
  return true;
end;
$$;
revoke all on function public.apply_notification_profile(uuid) from public,anon;
grant execute on function public.apply_notification_profile(uuid) to authenticated;

commit;
