begin;

create table public.hanami_plus_account_progress (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  lifetime_plus_days integer not null default 0 check (lifetime_plus_days >= 0),
  creative_xp integer not null default 0 check (creative_xp >= 0),
  profile_level integer generated always as (1 + floor(sqrt(creative_xp::numeric / 100))) stored,
  last_plus_started_at timestamptz,
  last_plus_ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.hanami_plus_reward_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('plus_days','cosmetic_drop','monthly_claim','gift_sent','gift_received','milestone','quest','creative_event','contest','loyalty_purchase','trial','community_contribution')),
  title text not null,
  description text,
  plus_days integer check (plus_days is null or plus_days > 0),
  boutique_item_id uuid references public.boutique_items(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.hanami_plus_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_account_id uuid references public.accounts(id) on delete set null,
  recipient_account_id uuid not null references public.accounts(id) on delete cascade,
  plus_days integer check (plus_days is null or plus_days in (1,7,30)),
  boutique_item_id uuid references public.boutique_items(id) on delete set null,
  gift_message text check (gift_message is null or length(gift_message) <= 280),
  anonymous_to_recipient boolean not null default false,
  status text not null default 'delivered' check (status in ('scheduled','delivered','opened','cancelled')),
  scheduled_for timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  check (plus_days is not null or boutique_item_id is not null)
);

create table public.hanami_plus_calendar_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  title text not null,
  description text,
  event_kind text not null check (event_kind in ('drop','creative_challenge','seasonal_rotation','preview','contest','bloom_day','quest','monthly_claim','labs')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  plus_only boolean not null default true,
  published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.hanami_plus_monthly_claims (
  account_id uuid not null references public.accounts(id) on delete cascade,
  claim_month date not null,
  boutique_item_id uuid references public.boutique_items(id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (account_id, claim_month),
  check (extract(day from claim_month) = 1)
);

create table public.hanami_plus_drop_offers (
  id uuid primary key default gen_random_uuid(),
  offer_key text not null unique,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.hanami_plus_drop_offer_items (
  offer_id uuid not null references public.hanami_plus_drop_offers(id) on delete cascade,
  boutique_item_id uuid not null references public.boutique_items(id) on delete cascade,
  sort_order smallint not null default 0,
  primary key (offer_id, boutique_item_id)
);

create table public.hanami_plus_drop_choices (
  offer_id uuid not null references public.hanami_plus_drop_offers(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  boutique_item_id uuid not null references public.boutique_items(id) on delete restrict,
  chosen_at timestamptz not null default now(),
  primary key (offer_id, account_id)
);

create table public.hanami_plus_loyalty_catalog (
  boutique_item_id uuid primary key references public.boutique_items(id) on delete cascade,
  minimum_lifetime_days integer not null default 0 check (minimum_lifetime_days >= 0),
  price_petals integer not null check (price_petals > 0),
  state text not null default 'draft' check (state in ('draft','published','retired')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hanami_plus_beta_features (
  feature_key text primary key,
  label text not null,
  description text not null,
  state text not null default 'closed' check (state in ('closed','plus_opt_in','public_beta')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.hanami_plus_beta_preferences (
  account_id uuid not null references public.accounts(id) on delete cascade,
  feature_key text not null references public.hanami_plus_beta_features(feature_key) on delete cascade,
  opted_in boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (account_id, feature_key)
);

create index hanami_plus_reward_history_account_idx on public.hanami_plus_reward_history(account_id, occurred_at desc);
create index hanami_plus_gifts_sender_idx on public.hanami_plus_gifts(sender_account_id, created_at desc) where sender_account_id is not null;
create index hanami_plus_gifts_recipient_idx on public.hanami_plus_gifts(recipient_account_id, created_at desc);
create index hanami_plus_calendar_published_idx on public.hanami_plus_calendar_events(published, starts_at);
create index hanami_plus_drop_offer_window_idx on public.hanami_plus_drop_offers(published, starts_at, ends_at);
create index hanami_plus_loyalty_catalog_browse_idx on public.hanami_plus_loyalty_catalog(state, minimum_lifetime_days, sort_order);

create trigger hanami_plus_account_progress_touch_updated_at before update on public.hanami_plus_account_progress for each row execute function private.touch_updated_at();
create trigger hanami_plus_calendar_events_touch_updated_at before update on public.hanami_plus_calendar_events for each row execute function private.touch_updated_at();
create trigger hanami_plus_drop_offers_touch_updated_at before update on public.hanami_plus_drop_offers for each row execute function private.touch_updated_at();
create trigger hanami_plus_loyalty_catalog_touch_updated_at before update on public.hanami_plus_loyalty_catalog for each row execute function private.touch_updated_at();
create trigger hanami_plus_beta_features_touch_updated_at before update on public.hanami_plus_beta_features for each row execute function private.touch_updated_at();
create trigger hanami_plus_beta_preferences_touch_updated_at before update on public.hanami_plus_beta_preferences for each row execute function private.touch_updated_at();

alter table public.hanami_plus_account_progress enable row level security;
alter table public.hanami_plus_reward_history enable row level security;
alter table public.hanami_plus_gifts enable row level security;
alter table public.hanami_plus_calendar_events enable row level security;
alter table public.hanami_plus_monthly_claims enable row level security;
alter table public.hanami_plus_drop_offers enable row level security;
alter table public.hanami_plus_drop_offer_items enable row level security;
alter table public.hanami_plus_drop_choices enable row level security;
alter table public.hanami_plus_loyalty_catalog enable row level security;
alter table public.hanami_plus_beta_features enable row level security;
alter table public.hanami_plus_beta_preferences enable row level security;

create policy hanami_plus_progress_self on public.hanami_plus_account_progress for select to authenticated using (account_id = (select auth.uid()));
create policy hanami_plus_history_self on public.hanami_plus_reward_history for select to authenticated using (account_id = (select auth.uid()));
create policy hanami_plus_gifts_self on public.hanami_plus_gifts for select to authenticated using (sender_account_id = (select auth.uid()) or recipient_account_id = (select auth.uid()));
create policy hanami_plus_calendar_read on public.hanami_plus_calendar_events for select to authenticated using (published = true);
create policy hanami_plus_monthly_claims_self on public.hanami_plus_monthly_claims for select to authenticated using (account_id = (select auth.uid()));
create policy hanami_plus_drop_offers_read on public.hanami_plus_drop_offers for select to authenticated using (published = true and now() between starts_at and ends_at);
create policy hanami_plus_drop_offer_items_read on public.hanami_plus_drop_offer_items for select to authenticated using (exists(select 1 from public.hanami_plus_drop_offers o where o.id=offer_id and o.published=true and now() between o.starts_at and o.ends_at));
create policy hanami_plus_drop_choices_self on public.hanami_plus_drop_choices for select to authenticated using (account_id = (select auth.uid()));
create policy hanami_plus_loyalty_catalog_read on public.hanami_plus_loyalty_catalog for select to authenticated using (state = 'published');
create policy hanami_plus_beta_features_read on public.hanami_plus_beta_features for select to authenticated using (state <> 'closed' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy hanami_plus_beta_preferences_self_read on public.hanami_plus_beta_preferences for select to authenticated using (account_id = (select auth.uid()));
create policy hanami_plus_beta_preferences_self_write on public.hanami_plus_beta_preferences for insert to authenticated with check (account_id = (select auth.uid()));
create policy hanami_plus_beta_preferences_self_update on public.hanami_plus_beta_preferences for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

revoke all on public.hanami_plus_account_progress from anon;
revoke all on public.hanami_plus_reward_history from anon;
revoke all on public.hanami_plus_gifts from anon;
revoke all on public.hanami_plus_calendar_events from anon;
revoke all on public.hanami_plus_monthly_claims from anon;
revoke all on public.hanami_plus_drop_offers from anon;
revoke all on public.hanami_plus_drop_offer_items from anon;
revoke all on public.hanami_plus_drop_choices from anon;
revoke all on public.hanami_plus_loyalty_catalog from anon;
revoke all on public.hanami_plus_beta_features from anon;
revoke all on public.hanami_plus_beta_preferences from anon;

grant select on public.hanami_plus_account_progress to authenticated;
grant select on public.hanami_plus_reward_history to authenticated;
grant select on public.hanami_plus_gifts to authenticated;
grant select on public.hanami_plus_calendar_events to authenticated;
grant select on public.hanami_plus_monthly_claims to authenticated;
grant select on public.hanami_plus_drop_offers to authenticated;
grant select on public.hanami_plus_drop_offer_items to authenticated;
grant select on public.hanami_plus_drop_choices to authenticated;
grant select on public.hanami_plus_loyalty_catalog to authenticated;
grant select on public.hanami_plus_beta_features to authenticated;
grant select,insert,update on public.hanami_plus_beta_preferences to authenticated;

create or replace function private.ensure_hanami_plus_progress()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.hanami_plus_account_progress(account_id) values(new.id) on conflict(account_id) do nothing;
  return new;
end;
$$;
revoke all on function private.ensure_hanami_plus_progress() from public,anon,authenticated;
create trigger accounts_ensure_hanami_plus_progress after insert on public.accounts for each row execute function private.ensure_hanami_plus_progress();
insert into public.hanami_plus_account_progress(account_id) select id from public.accounts on conflict(account_id) do nothing;

create or replace function public.current_hanami_plus_hub()
returns table(
  active boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  days_remaining integer,
  lifetime_plus_days integer,
  creative_xp integer,
  profile_level integer,
  petal_balance integer,
  monthly_claimed boolean,
  beta_opt_in_count integer
)
language sql stable security definer set search_path='' as $$
  select
    coalesce(e.ends_at > now(), false) as active,
    e.starts_at,
    e.ends_at,
    case when e.ends_at > now() then greatest(0, ceil(extract(epoch from (e.ends_at-now()))/86400.0)::integer) else 0 end,
    coalesce(p.lifetime_plus_days,0),
    coalesce(p.creative_xp,0),
    coalesce(p.profile_level,1),
    coalesce(w.balance,0),
    exists(select 1 from public.hanami_plus_monthly_claims c where c.account_id=(select auth.uid()) and c.claim_month=date_trunc('month', now() at time zone 'Asia/Tokyo')::date),
    (select count(*)::integer from public.hanami_plus_beta_preferences b where b.account_id=(select auth.uid()) and b.opted_in=true)
  from (select (select auth.uid()) as account_id) a
  left join public.hanami_plus_entitlements e on e.account_id=a.account_id
  left join public.hanami_plus_account_progress p on p.account_id=a.account_id
  left join public.petal_wallets w on w.account_id=a.account_id;
$$;
revoke all on function public.current_hanami_plus_hub() from public,anon;
grant execute on function public.current_hanami_plus_hub() to authenticated;

create or replace function public.set_hanami_plus_beta_preference(p_feature_key text, p_opted_in boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_state text;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select state into v_state from public.hanami_plus_beta_features
    where feature_key=p_feature_key and state in ('plus_opt_in','public_beta')
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now());
  if v_state is null then raise exception 'Beta feature is unavailable' using errcode='P0002'; end if;
  if v_state='plus_opt_in' and not exists(select 1 from public.hanami_plus_entitlements e where e.account_id=v_account and e.ends_at>now()) then
    raise exception 'Active Hanami+ required' using errcode='42501';
  end if;
  insert into public.hanami_plus_beta_preferences(account_id,feature_key,opted_in)
  values(v_account,p_feature_key,p_opted_in)
  on conflict(account_id,feature_key) do update set opted_in=excluded.opted_in,updated_at=now();
  return p_opted_in;
end;
$$;
revoke all on function public.set_hanami_plus_beta_preference(text,boolean) from public,anon;
grant execute on function public.set_hanami_plus_beta_preference(text,boolean) to authenticated;

commit;
