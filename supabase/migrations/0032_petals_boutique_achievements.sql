create table public.petal_wallets (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.petal_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  amount integer not null check (amount <> 0),
  source_kind text not null check (source_kind in ('assignment','daily_login','roleplay_session','likes_received','teacher_grant','game','purchase','achievement','admin_adjustment')),
  description text not null,
  reference_key text not null unique,
  created_by_character_id uuid references public.characters(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.boutique_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  item_type text not null check (item_type in ('frame','effect','nameplate','hanami_plus_pass')),
  collection_name text,
  season text not null default 'permanent' check (season in ('permanent','spring','summer','fall','winter')),
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','legendary')),
  price_petals integer not null check (price_petals > 0),
  state text not null default 'draft' check (state in ('draft','published','retired')),
  featured boolean not null default false,
  is_new boolean not null default true,
  pass_days smallint check (pass_days is null or pass_days between 1 and 365),
  preview_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(slug)) between 2 and 80),
  check (length(trim(name)) between 2 and 120),
  check ((item_type='hanami_plus_pass' and pass_days is not null) or (item_type<>'hanami_plus_pass' and pass_days is null))
);

create table public.inventory_items (
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.boutique_items(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id,item_id)
);

create table public.hanami_plus_entitlements (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_item_id uuid references public.boutique_items(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  school_date date not null,
  status text not null default 'open' check (status in ('draft','open','closed','cancelled')),
  petal_reward integer not null default 10 check (petal_reward between 1 and 100),
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (extract(year from school_date)=2006)
);

create table public.roleplay_session_participants (
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(session_id,character_id)
);

create table public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  category text not null check (category in ('social','academics','campus','history')),
  collection_name text not null default 'Hanami Beginnings',
  criteria_type text not null check (criteria_type in ('post_count','blog_count','friends_count','club_count','assignment_count','attendance_count','reactions_received')),
  threshold integer not null check (threshold > 0),
  petal_reward integer not null default 0 check (petal_reward between 0 and 500),
  hidden boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.character_achievements (
  character_id uuid not null references public.characters(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  progress_value integer not null default 0,
  primary key(character_id,achievement_id)
);

create index petal_ledger_account_created_idx on public.petal_ledger(account_id,created_at desc);
create index petal_ledger_character_created_idx on public.petal_ledger(character_id,created_at desc) where character_id is not null;
create index petal_ledger_source_idx on public.petal_ledger(account_id,source_kind,created_at desc);
create index boutique_items_browse_idx on public.boutique_items(state,item_type,featured,is_new,created_at desc);
create index inventory_items_item_idx on public.inventory_items(item_id);
create index roleplay_sessions_date_status_idx on public.roleplay_sessions(school_date,status);
create index roleplay_sessions_creator_idx on public.roleplay_sessions(created_by_character_id);
create index roleplay_participants_character_idx on public.roleplay_session_participants(character_id,session_id);
create index achievement_definitions_browse_idx on public.achievement_definitions(active,category,collection_name,sort_order);
create index character_achievements_unlocked_idx on public.character_achievements(character_id,unlocked_at desc);

create trigger petal_wallets_touch_updated_at before update on public.petal_wallets for each row execute function private.touch_updated_at();
create trigger boutique_items_touch_updated_at before update on public.boutique_items for each row execute function private.touch_updated_at();
create trigger inventory_items_touch_updated_at before update on public.inventory_items for each row execute function private.touch_updated_at();
create trigger hanami_plus_entitlements_touch_updated_at before update on public.hanami_plus_entitlements for each row execute function private.touch_updated_at();
create trigger roleplay_sessions_touch_updated_at before update on public.roleplay_sessions for each row execute function private.touch_updated_at();
create trigger achievement_definitions_touch_updated_at before update on public.achievement_definitions for each row execute function private.touch_updated_at();

create or replace function private.ensure_petal_wallet()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.petal_wallets(account_id) values(new.id) on conflict(account_id) do nothing;
  return new;
end;
$$;
revoke all on function private.ensure_petal_wallet() from public,anon,authenticated;
create trigger accounts_ensure_petal_wallet after insert on public.accounts for each row execute function private.ensure_petal_wallet();
insert into public.petal_wallets(account_id) select id from public.accounts on conflict(account_id) do nothing;

create or replace function private.post_petal_entry(
  p_account_id uuid,p_character_id uuid,p_amount integer,p_source_kind text,p_description text,p_reference_key text,
  p_created_by_character_id uuid default null,p_metadata jsonb default '{}'::jsonb
)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_balance integer; v_entry_id uuid;
begin
  if p_amount=0 then return false; end if;
  if p_source_kind not in ('assignment','daily_login','roleplay_session','likes_received','teacher_grant','game','purchase','achievement','admin_adjustment') then raise exception 'Invalid Petal source kind' using errcode='23514'; end if;
  insert into public.petal_wallets(account_id) values(p_account_id) on conflict(account_id) do nothing;
  select balance into v_balance from public.petal_wallets where account_id=p_account_id for update;
  if p_amount<0 and v_balance+p_amount<0 then raise exception 'Insufficient Petals' using errcode='P0001'; end if;
  insert into public.petal_ledger(account_id,character_id,amount,source_kind,description,reference_key,created_by_character_id,metadata)
  values(p_account_id,p_character_id,p_amount,p_source_kind,p_description,p_reference_key,p_created_by_character_id,coalesce(p_metadata,'{}'::jsonb))
  on conflict(reference_key) do nothing returning id into v_entry_id;
  if v_entry_id is null then return false; end if;
  update public.petal_wallets set balance=balance+p_amount,lifetime_earned=lifetime_earned+greatest(p_amount,0),lifetime_spent=lifetime_spent+greatest(-p_amount,0) where account_id=p_account_id;
  return true;
end;
$$;
revoke all on function private.post_petal_entry(uuid,uuid,integer,text,text,text,uuid,jsonb) from public,anon,authenticated;

create or replace function public.claim_daily_petals()
returns table(balance integer,awarded integer) language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_awarded boolean; v_day date;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  v_day := (now() at time zone 'Asia/Tokyo')::date;
  v_awarded := private.post_petal_entry(v_account,v_character,5,'daily_login','Daily Hanami login','daily:'||v_account::text||':'||v_day::text,null,jsonb_build_object('tokyo_day',v_day::text));
  return query select w.balance,case when v_awarded then 5 else 0 end from public.petal_wallets w where w.account_id=v_account;
end;
$$;
revoke all on function public.claim_daily_petals() from public,anon;
grant execute on function public.claim_daily_petals() to authenticated;

create or replace function public.play_petal_garden()
returns table(balance integer,awarded integer) language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_awarded boolean; v_day date;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  v_day := (now() at time zone 'Asia/Tokyo')::date;
  v_awarded := private.post_petal_entry(v_account,v_character,3,'game','Daily Petal Garden','game:garden:'||v_account::text||':'||v_day::text,null,jsonb_build_object('tokyo_day',v_day::text));
  return query select w.balance,case when v_awarded then 3 else 0 end from public.petal_wallets w where w.account_id=v_account;
end;
$$;
revoke all on function public.play_petal_garden() from public,anon;
grant execute on function public.play_petal_garden() to authenticated;

create or replace function public.grant_petals_to_character(p_character_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_actor uuid; v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_amount<1 or p_amount>100 then raise exception 'Teacher grants must be between 1 and 100 Petals' using errcode='22023'; end if;
  select a.active_character_id into v_actor from public.accounts a where a.id=v_account;
  if not private.account_has_capability(v_account,'economy.manage'::extensions.citext) and not exists(
    select 1 from public.characters c where c.id=v_actor and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then raise exception 'Faculty or economy management access required' using errcode='42501'; end if;
  select c.account_id into v_target_account from public.characters c where c.id=p_character_id and c.character_state='active';
  if v_target_account is null then raise exception 'Target character is unavailable' using errcode='P0002'; end if;
  return private.post_petal_entry(v_target_account,p_character_id,p_amount,'teacher_grant',coalesce(nullif(trim(p_note),''),'Faculty Petal grant'),'teacher:'||p_request_id::text,v_actor,jsonb_build_object('request_id',p_request_id::text));
end;
$$;
revoke all on function public.grant_petals_to_character(uuid,integer,text,uuid) from public,anon;
grant execute on function public.grant_petals_to_character(uuid,integer,text,uuid) to authenticated;

create or replace function public.purchase_boutique_item(p_item_id uuid,p_request_id uuid)
returns table(balance integer,item_id uuid,quantity integer) language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_item public.boutique_items%rowtype; v_existing integer; v_now timestamptz := now(); v_start timestamptz; v_end timestamptz; v_posted boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  select * into v_item from public.boutique_items where id=p_item_id and state='published';
  if not found then raise exception 'Boutique item is unavailable' using errcode='P0002'; end if;
  select i.quantity into v_existing from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id;
  if v_existing is not null and v_item.item_type<>'hanami_plus_pass' then raise exception 'Item already owned' using errcode='P0001'; end if;
  v_posted := private.post_petal_entry(v_account,v_character,-v_item.price_petals,'purchase','Purchased '||v_item.name,'purchase:'||p_request_id::text,v_character,jsonb_build_object('item_id',p_item_id::text,'item_slug',v_item.slug));
  if not v_posted then
    return query select w.balance,p_item_id,coalesce(i.quantity,0) from public.petal_wallets w left join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account;
    return;
  end if;
  insert into public.inventory_items(account_id,item_id,quantity) values(v_account,p_item_id,1)
  on conflict(account_id,item_id) do update set quantity=public.inventory_items.quantity+1,updated_at=now();
  if v_item.item_type='hanami_plus_pass' then
    select greatest(v_now,coalesce(e.ends_at,v_now)) into v_start from public.hanami_plus_entitlements e where e.account_id=v_account;
    v_start := coalesce(v_start,v_now);
    v_end := v_start + make_interval(days=>v_item.pass_days);
    insert into public.hanami_plus_entitlements(account_id,starts_at,ends_at,source_item_id) values(v_account,v_now,v_end,p_item_id)
    on conflict(account_id) do update set ends_at=v_end,source_item_id=p_item_id,updated_at=now();
  end if;
  return query select w.balance,p_item_id,i.quantity from public.petal_wallets w join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account;
end;
$$;
revoke all on function public.purchase_boutique_item(uuid,uuid) from public,anon;
grant execute on function public.purchase_boutique_item(uuid,uuid) to authenticated;

create or replace function private.validate_roleplay_session_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then raise exception 'Roleplay session creator cannot be changed' using errcode='23514'; end if;
  if not exists(
    select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then raise exception 'Roleplay session creator must be faculty or administration' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function private.validate_roleplay_session_creator() from public,anon,authenticated;
create trigger roleplay_sessions_validate_creator before insert or update of created_by_character_id on public.roleplay_sessions for each row execute function private.validate_roleplay_session_creator();

create or replace function public.close_roleplay_session(p_session_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_actor uuid; v_session public.roleplay_sessions%rowtype; v_part record; v_count integer:=0; v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_actor from public.accounts where id=v_account;
  select * into v_session from public.roleplay_sessions where id=p_session_id for update;
  if not found then raise exception 'Roleplay session not found' using errcode='P0002'; end if;
  if v_session.status='closed' then return 0; end if;
  if v_session.created_by_character_id<>v_actor and not private.account_has_capability(v_account,'economy.manage'::extensions.citext) then raise exception 'Session creator or economy manager required' using errcode='42501'; end if;
  update public.roleplay_sessions set status='closed',closed_at=now() where id=p_session_id;
  for v_part in select character_id from public.roleplay_session_participants where session_id=p_session_id loop
    select account_id into v_target_account from public.characters where id=v_part.character_id;
    if private.post_petal_entry(v_target_account,v_part.character_id,v_session.petal_reward,'roleplay_session','Roleplay session: '||v_session.title,'roleplay:'||p_session_id::text||':'||v_part.character_id::text,v_actor,jsonb_build_object('session_id',p_session_id::text)) then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.close_roleplay_session(uuid) from public,anon;
grant execute on function public.close_roleplay_session(uuid) to authenticated;

create or replace function private.award_assignment_petals()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_account uuid;
begin
  if new.points_earned is not null and (tg_op='INSERT' or old.points_earned is null) then
    select account_id into v_account from public.characters where id=new.student_character_id;
    perform private.post_petal_entry(v_account,new.student_character_id,10,'assignment','Completed graded assignment','assignment:'||new.assignment_id::text||':'||new.student_character_id::text,new.graded_by_character_id,jsonb_build_object('assignment_id',new.assignment_id::text));
  end if;
  return new;
end;
$$;
revoke all on function private.award_assignment_petals() from public,anon,authenticated;
create trigger academic_grades_award_petals after insert or update of points_earned on public.academic_grades for each row execute function private.award_assignment_petals();

create or replace function private.award_reaction_petals()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_author uuid; v_account uuid;
begin
  select p.author_character_id into v_author from public.social_posts p where p.id=new.post_id and p.state='published';
  if v_author is null or v_author=new.character_id then return new; end if;
  select account_id into v_account from public.characters where id=v_author;
  perform private.post_petal_entry(v_account,v_author,1,'likes_received','Reaction received','reaction:'||new.post_id::text||':'||new.character_id::text,new.character_id,jsonb_build_object('post_id',new.post_id::text,'reaction_type',new.reaction_type));
  return new;
end;
$$;
revoke all on function private.award_reaction_petals() from public,anon,authenticated;
create trigger social_post_reactions_award_petals after insert on public.social_post_reactions for each row execute function private.award_reaction_petals();

create or replace function public.sync_my_achievements()
returns integer language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_def record; v_progress integer; v_count integer:=0; v_inserted uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  for v_def in select * from public.achievement_definitions where active loop
    v_progress := case v_def.criteria_type
      when 'post_count' then (select count(*)::integer from public.social_posts where author_character_id=v_character and state='published')
      when 'blog_count' then (select count(*)::integer from public.social_posts where author_character_id=v_character and post_type='blog' and state='published')
      when 'friends_count' then (select count(*)::integer from public.friendships where status='accepted' and (requester_character_id=v_character or addressee_character_id=v_character))
      when 'club_count' then (select count(*)::integer from public.campus_group_members where character_id=v_character and status='active')
      when 'assignment_count' then (select count(*)::integer from public.academic_grades where student_character_id=v_character and points_earned is not null)
      when 'attendance_count' then (select count(*)::integer from public.academic_attendance where student_character_id=v_character)
      when 'reactions_received' then (select count(*)::integer from public.social_post_reactions r join public.social_posts p on p.id=r.post_id where p.author_character_id=v_character)
      else 0 end;
    if v_progress>=v_def.threshold then
      v_inserted := null;
      insert into public.character_achievements(character_id,achievement_id,progress_value)
      values(v_character,v_def.id,v_progress)
      on conflict(character_id,achievement_id) do nothing returning achievement_id into v_inserted;
      if v_inserted is null then
        update public.character_achievements set progress_value=greatest(progress_value,v_progress) where character_id=v_character and achievement_id=v_def.id;
      else
        v_count:=v_count+1;
        if v_def.petal_reward>0 then
          perform private.post_petal_entry(v_account,v_character,v_def.petal_reward,'achievement','Achievement: '||v_def.name,'achievement:'||v_character::text||':'||v_def.code,null,jsonb_build_object('achievement_code',v_def.code));
        end if;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.sync_my_achievements() from public,anon;
grant execute on function public.sync_my_achievements() to authenticated;

alter table public.petal_wallets enable row level security;
alter table public.petal_ledger enable row level security;
alter table public.boutique_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.hanami_plus_entitlements enable row level security;
alter table public.roleplay_sessions enable row level security;
alter table public.roleplay_session_participants enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.character_achievements enable row level security;

revoke all on public.petal_wallets,public.petal_ledger,public.boutique_items,public.inventory_items,public.hanami_plus_entitlements,public.roleplay_sessions,public.roleplay_session_participants,public.achievement_definitions,public.character_achievements from anon,authenticated;
grant select on public.petal_wallets,public.petal_ledger,public.inventory_items,public.hanami_plus_entitlements,public.character_achievements to authenticated;
grant select,insert,update,delete on public.boutique_items,public.achievement_definitions to authenticated;
grant select,insert,update,delete on public.roleplay_sessions,public.roleplay_session_participants to authenticated;

create policy petal_wallets_select_own on public.petal_wallets for select to authenticated using(account_id=(select auth.uid()));
create policy petal_ledger_select_own on public.petal_ledger for select to authenticated using(account_id=(select auth.uid()));
create policy inventory_items_select_own on public.inventory_items for select to authenticated using(account_id=(select auth.uid()));
create policy hanami_plus_entitlements_select_own on public.hanami_plus_entitlements for select to authenticated using(account_id=(select auth.uid()));
create policy boutique_items_select_visible on public.boutique_items for select to authenticated using(state='published' or public.has_capability('boutique.manage'));
create policy boutique_items_manage_insert on public.boutique_items for insert to authenticated with check(public.has_capability('boutique.manage'));
create policy boutique_items_manage_update on public.boutique_items for update to authenticated using(public.has_capability('boutique.manage')) with check(public.has_capability('boutique.manage'));
create policy boutique_items_manage_delete on public.boutique_items for delete to authenticated using(public.has_capability('boutique.manage'));
create policy achievement_definitions_select_visible on public.achievement_definitions for select to authenticated using(active or public.has_capability('economy.manage'));
create policy achievement_definitions_manage_insert on public.achievement_definitions for insert to authenticated with check(public.has_capability('economy.manage'));
create policy achievement_definitions_manage_update on public.achievement_definitions for update to authenticated using(public.has_capability('economy.manage')) with check(public.has_capability('economy.manage'));
create policy achievement_definitions_manage_delete on public.achievement_definitions for delete to authenticated using(public.has_capability('economy.manage'));
create policy character_achievements_select_own on public.character_achievements for select to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())));

create policy roleplay_sessions_select_visible on public.roleplay_sessions for select to authenticated using(status in ('open','closed') or public.has_capability('economy.manage') or created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())));
create policy roleplay_sessions_staff_insert on public.roleplay_sessions for insert to authenticated with check(created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and exists(select 1 from public.characters c where c.id=created_by_character_id and c.character_state='active' and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))));
create policy roleplay_sessions_staff_update on public.roleplay_sessions for update to authenticated using(created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage')) with check(created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage'));
create policy roleplay_sessions_staff_delete on public.roleplay_sessions for delete to authenticated using(created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage'));
create policy roleplay_participants_select_visible on public.roleplay_session_participants for select to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or exists(select 1 from public.roleplay_sessions s where s.id=session_id and (s.created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage'))));
create policy roleplay_participants_join on public.roleplay_session_participants for insert to authenticated with check((character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and exists(select 1 from public.roleplay_sessions s where s.id=session_id and s.status='open')) or exists(select 1 from public.roleplay_sessions s where s.id=session_id and (s.created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage'))));
create policy roleplay_participants_leave on public.roleplay_session_participants for delete to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or exists(select 1 from public.roleplay_sessions s where s.id=session_id and (s.created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('economy.manage'))));

insert into public.boutique_items(slug,name,description,item_type,collection_name,season,rarity,price_petals,state,featured,is_new,pass_days,preview_token) values
('sakura-window','Sakura Window','A soft cherry-blossom profile frame.','frame','Hanami Classics','spring','common',40,'published',true,true,null,'sakura'),
('navy-campus','Navy Campus','A crisp navy school-profile frame.','frame','Hanami Classics','permanent','common',35,'published',false,true,null,'navy'),
('golden-hour','Golden Hour','A warm gold profile frame for standout moments.','frame','After School','fall','rare',90,'published',true,true,null,'gold'),
('petal-drift','Petal Drift','A subtle drifting-petal profile effect.','effect','Spring Festival','spring','uncommon',70,'published',true,true,null,'petals'),
('star-spark','Star Spark','A tiny star shimmer around your profile.','effect','Night Campus','winter','rare',110,'published',false,true,null,'stars'),
('class-rep','Class Representative','A structured school-style nameplate.','nameplate','Campus Roles','permanent','common',45,'published',false,true,null,'class-rep'),
('after-school','After School','A relaxed nameplate inspired by late club hours.','nameplate','After School','fall','uncommon',65,'published',true,true,null,'after-school'),
('hanami-plus-7','Hanami+ 7-Day Pass','Seven days of Hanami+ cosmetic access.','hanami_plus_pass','Hanami+','permanent','uncommon',120,'published',false,true,7,'plus-7'),
('hanami-plus-30','Hanami+ 30-Day Pass','Thirty days of Hanami+ cosmetic access.','hanami_plus_pass','Hanami+','permanent','rare',360,'published',true,true,30,'plus-30')
on conflict(slug) do nothing;

insert into public.achievement_definitions(code,name,description,category,collection_name,criteria_type,threshold,petal_reward,sort_order) values
('first-post','First Post','Publish your first Hanami social post.','social','Hanami Beginnings','post_count',1,5,10),
('five-posts','Noticeboard Regular','Publish five Hanami social posts.','social','Hanami Beginnings','post_count',5,10,20),
('first-blog','Dear Diary','Publish your first character blog.','social','Writer''s Corner','blog_count',1,10,30),
('five-friends','Circle of Five','Reach five accepted friends.','social','Your Circle','friends_count',5,15,40),
('join-club','After School','Become an active member of a campus group.','campus','Campus Life','club_count',1,10,50),
('first-grade','Classroom Bloom','Receive your first graded assignment.','academics','School Days','assignment_count',1,10,60),
('ten-attendance','Showing Up','Build ten attendance records.','academics','School Days','attendance_count',10,15,70),
('ten-reactions','Seen Around Campus','Receive ten reactions on your posts.','social','Your Circle','reactions_received',10,20,80)
on conflict(code) do nothing;
