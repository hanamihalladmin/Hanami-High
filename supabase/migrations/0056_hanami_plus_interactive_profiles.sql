begin;

create table public.character_profile_interactivity (
  character_id uuid primary key references public.characters(id) on delete cascade,
  favicon_url text,
  profile_tab_title text check (profile_tab_title is null or length(profile_tab_title) between 1 and 60),
  divider_style text not null default 'classic' check (divider_style in ('classic','petals','stars','ribbon','doodles','sparkle','notebook')),
  divider_animation text not null default 'none' check (divider_animation in ('none','drift','shimmer','float','draw','pulse')),
  scrollbar_skin text not null default 'standard' check (scrollbar_skin in ('standard','pink','sage','notebook','pixel','sparkle')),
  tooltip_skin text not null default 'standard' check (tooltip_skin in ('standard','pink-note','sage-card','pixel','speech-bubble')),
  selection_color text not null default '#eab0c7' check (selection_color ~ '^#[0-9A-Fa-f]{6}$'),
  link_hover_effect text not null default 'underline' check (link_hover_effect in ('underline','glow','sparkle','color-shift','sticker-pop','soft-slide')),
  button_effect text not null default 'none' check (button_effect in ('none','soft-pop','sparkle','glow','press','wiggle')),
  button_sound_key text check (button_sound_key is null or button_sound_key in ('soft-click','page-flip','sparkle','chime','bubble')),
  mini_games jsonb not null default '{"petal_clicker":true,"stamp_hunt":false,"tiny_puzzle":false}'::jsonb,
  show_interaction_counters boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.character_profile_interaction_counters (
  character_id uuid not null references public.characters(id) on delete cascade,
  interaction_kind text not null check (interaction_kind in ('profile_visit','petal_game','stamp_game','puzzle_game','guestbook_visit','decoration_click')),
  total_count bigint not null default 0 check (total_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (character_id, interaction_kind)
);

create table private.character_profile_interaction_daily (
  account_id uuid not null references public.accounts(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  interaction_kind text not null,
  tokyo_day date not null,
  created_at timestamptz not null default now(),
  primary key (account_id,target_character_id,interaction_kind,tokyo_day)
);

create index character_profile_interaction_daily_target_idx on private.character_profile_interaction_daily(target_character_id,tokyo_day desc);

create trigger character_profile_interactivity_touch_updated_at before update on public.character_profile_interactivity for each row execute function private.touch_updated_at();
create trigger character_profile_interaction_counters_touch_updated_at before update on public.character_profile_interaction_counters for each row execute function private.touch_updated_at();

alter table public.character_profile_interactivity enable row level security;
alter table public.character_profile_interaction_counters enable row level security;

create or replace function private.can_edit_character_plus_profile(p_character_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.characters c
    join public.hanami_plus_entitlements e on e.account_id=c.account_id and e.ends_at>now()
    where c.id=p_character_id and c.account_id=(select auth.uid())
  );
$$;
revoke all on function private.can_edit_character_plus_profile(uuid) from public,anon,authenticated;

create or replace function private.can_view_character_interactive_profile(p_character_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.characters c
    left join public.published_character_profiles p on p.character_id=c.id
    where c.id=p_character_id
      and (
        c.account_id=(select auth.uid())
        or (
          c.character_state='active'
          and p.character_id is not null
          and (
            p.profile_visibility='hanami'
            or (
              p.profile_visibility='friends'
              and exists(
                select 1 from public.friendships f
                join public.accounts a on a.id=(select auth.uid())
                where f.status='accepted' and a.active_character_id is not null
                  and ((f.requester_character_id=p_character_id and f.addressee_character_id=a.active_character_id)
                    or (f.addressee_character_id=p_character_id and f.requester_character_id=a.active_character_id))
              )
            )
          )
        )
      )
  );
$$;
revoke all on function private.can_view_character_interactive_profile(uuid) from public,anon,authenticated;

create policy character_profile_interactivity_visible on public.character_profile_interactivity
for select to authenticated using (private.can_view_character_interactive_profile(character_id));
create policy character_profile_interactivity_plus_insert on public.character_profile_interactivity
for insert to authenticated with check (private.can_edit_character_plus_profile(character_id));
create policy character_profile_interactivity_plus_update on public.character_profile_interactivity
for update to authenticated using (private.can_edit_character_plus_profile(character_id)) with check (private.can_edit_character_plus_profile(character_id));
create policy character_profile_interactivity_plus_delete on public.character_profile_interactivity
for delete to authenticated using (private.can_edit_character_plus_profile(character_id));

create policy character_profile_interaction_counters_visible on public.character_profile_interaction_counters
for select to authenticated using (private.can_view_character_interactive_profile(character_id));

revoke all on public.character_profile_interactivity from anon;
revoke all on public.character_profile_interaction_counters from anon;
grant select,insert,update,delete on public.character_profile_interactivity to authenticated;
grant select on public.character_profile_interaction_counters to authenticated;

create or replace function public.ensure_my_profile_interactivity(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_profile(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;
  insert into public.character_profile_interactivity(character_id) values(p_character_id) on conflict(character_id) do nothing;
  insert into public.character_profile_interaction_counters(character_id,interaction_kind,total_count)
  select p_character_id,k,0 from unnest(array['profile_visit','petal_game','stamp_game','puzzle_game','guestbook_visit','decoration_click']) k
  on conflict(character_id,interaction_kind) do nothing;
  return true;
end;
$$;
revoke all on function public.ensure_my_profile_interactivity(uuid) from public,anon;
grant execute on function public.ensure_my_profile_interactivity(uuid) to authenticated;

create or replace function public.record_profile_interaction(p_target_character_id uuid,p_interaction_kind text)
returns bigint language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_day date := (now() at time zone 'Asia/Tokyo')::date;
  v_inserted boolean := false;
  v_total bigint;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_interaction_kind not in ('profile_visit','petal_game','stamp_game','puzzle_game','guestbook_visit','decoration_click') then
    raise exception 'Unsupported profile interaction' using errcode='22023';
  end if;
  if not private.can_view_character_interactive_profile(p_target_character_id) then raise exception 'Profile is unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.characters c where c.id=p_target_character_id and c.account_id=v_account) then
    select coalesce(total_count,0) into v_total from public.character_profile_interaction_counters where character_id=p_target_character_id and interaction_kind=p_interaction_kind;
    return coalesce(v_total,0);
  end if;

  insert into private.character_profile_interaction_daily(account_id,target_character_id,interaction_kind,tokyo_day)
  values(v_account,p_target_character_id,p_interaction_kind,v_day)
  on conflict do nothing;
  v_inserted := found;

  if v_inserted then
    insert into public.character_profile_interaction_counters(character_id,interaction_kind,total_count)
    values(p_target_character_id,p_interaction_kind,1)
    on conflict(character_id,interaction_kind) do update set total_count=public.character_profile_interaction_counters.total_count+1,updated_at=now()
    returning total_count into v_total;
  else
    select total_count into v_total from public.character_profile_interaction_counters where character_id=p_target_character_id and interaction_kind=p_interaction_kind;
  end if;

  return coalesce(v_total,0);
end;
$$;
revoke all on function public.record_profile_interaction(uuid,text) from public,anon;
grant execute on function public.record_profile_interaction(uuid,text) to authenticated;

commit;
