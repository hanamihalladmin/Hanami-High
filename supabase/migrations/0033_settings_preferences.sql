create table public.account_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  notify_messages boolean not null default true,
  notify_social boolean not null default true,
  notify_school boolean not null default true,
  reduced_motion boolean not null default false,
  compact_mode boolean not null default false,
  high_contrast boolean not null default false,
  font_scale smallint not null default 100 check (font_scale between 90 and 130),
  dm_policy text not null default 'everyone' check (dm_policy in ('everyone','friends','none')),
  friend_request_policy text not null default 'everyone' check (friend_request_policy in ('everyone','friends_of_friends','none')),
  show_online_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.character_preferences (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  default_post_visibility text not null default 'hanami' check (default_post_visibility in ('hanami','friends','private')),
  allow_profile_comments boolean not null default true,
  allow_guestbook boolean not null default true,
  show_school_role boolean not null default true,
  show_activity_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_preferences_account_idx on public.character_preferences(account_id,character_id);
create trigger account_preferences_touch_updated_at before update on public.account_preferences for each row execute function private.touch_updated_at();
create trigger character_preferences_touch_updated_at before update on public.character_preferences for each row execute function private.touch_updated_at();

create or replace function private.ensure_account_preferences()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.account_preferences(account_id) values(new.id) on conflict(account_id) do nothing;
  return new;
end;
$$;
revoke all on function private.ensure_account_preferences() from public,anon,authenticated;
create trigger accounts_ensure_preferences after insert on public.accounts for each row execute function private.ensure_account_preferences();
insert into public.account_preferences(account_id) select id from public.accounts on conflict(account_id) do nothing;

create or replace function private.ensure_character_preferences()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.character_preferences(character_id,account_id) values(new.id,new.account_id) on conflict(character_id) do nothing;
  return new;
end;
$$;
revoke all on function private.ensure_character_preferences() from public,anon,authenticated;
create trigger characters_ensure_preferences after insert on public.characters for each row execute function private.ensure_character_preferences();
insert into public.character_preferences(character_id,account_id) select id,account_id from public.characters on conflict(character_id) do nothing;

create or replace function private.validate_character_preferences_owner()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.characters c where c.id=new.character_id and c.account_id=new.account_id) then
    raise exception 'Character preference ownership mismatch' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.character_id<>old.character_id or new.account_id<>old.account_id) then
    raise exception 'Character preference identity cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_character_preferences_owner() from public,anon,authenticated;
create trigger character_preferences_validate_owner before insert or update on public.character_preferences for each row execute function private.validate_character_preferences_owner();

create or replace function private.account_shows_online(p_account_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select p.show_online_status from public.account_preferences p where p.account_id=p_account_id),true);
$$;
revoke all on function private.account_shows_online(uuid) from public,anon;
grant execute on function private.account_shows_online(uuid) to authenticated;

alter table public.account_preferences enable row level security;
alter table public.character_preferences enable row level security;
revoke all on public.account_preferences,public.character_preferences from anon,authenticated;
grant select,insert,update on public.account_preferences,public.character_preferences to authenticated;
create policy account_preferences_select_own on public.account_preferences for select to authenticated using(account_id=(select auth.uid()));
create policy account_preferences_insert_own on public.account_preferences for insert to authenticated with check(account_id=(select auth.uid()));
create policy account_preferences_update_own on public.account_preferences for update to authenticated using(account_id=(select auth.uid())) with check(account_id=(select auth.uid()));
create policy character_preferences_select_own on public.character_preferences for select to authenticated using(account_id=(select auth.uid()));
create policy character_preferences_insert_own on public.character_preferences for insert to authenticated with check(account_id=(select auth.uid()) and exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy character_preferences_update_own on public.character_preferences for update to authenticated using(account_id=(select auth.uid())) with check(account_id=(select auth.uid()));

drop policy if exists character_presence_select_campus on public.character_presence;
create policy character_presence_select_campus on public.character_presence for select to authenticated using(account_id=(select auth.uid()) or private.account_shows_online(account_id));
