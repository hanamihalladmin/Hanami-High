begin;

create table public.hanami_plus_monthly_rewards (
  claim_month date primary key,
  boutique_item_id uuid not null references public.boutique_items(id) on delete restrict,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(day from claim_month) = 1)
);

create trigger hanami_plus_monthly_rewards_touch_updated_at before update on public.hanami_plus_monthly_rewards for each row execute function private.touch_updated_at();
alter table public.hanami_plus_monthly_rewards enable row level security;
create policy hanami_plus_monthly_rewards_read on public.hanami_plus_monthly_rewards for select to authenticated using (published = true);
revoke all on public.hanami_plus_monthly_rewards from anon;
grant select on public.hanami_plus_monthly_rewards to authenticated;

create or replace function private.require_active_hanami_plus(p_account_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.hanami_plus_entitlements e where e.account_id=p_account_id and e.ends_at>now()) then
    raise exception 'Active Hanami+ required' using errcode='42501';
  end if;
end;
$$;
revoke all on function private.require_active_hanami_plus(uuid) from public,anon,authenticated;

create or replace function public.claim_hanami_plus_monthly_reward()
returns table(item_id uuid,item_name text,claimed_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_month date := date_trunc('month', now() at time zone 'Asia/Tokyo')::date;
  v_item uuid;
  v_name text;
  v_claimed timestamptz := now();
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_active_hanami_plus(v_account);

  select r.boutique_item_id,b.name into v_item,v_name
  from public.hanami_plus_monthly_rewards r
  join public.boutique_items b on b.id=r.boutique_item_id and b.state='published'
  where r.claim_month=v_month and r.published=true;
  if v_item is null then raise exception 'No Hanami+ monthly reward is available yet' using errcode='P0002'; end if;
  if exists(select 1 from public.hanami_plus_monthly_claims c where c.account_id=v_account and c.claim_month=v_month) then
    raise exception 'Monthly Hanami+ reward already claimed' using errcode='P0001';
  end if;
  if exists(select 1 from public.inventory_items i where i.account_id=v_account and i.item_id=v_item) then
    raise exception 'Monthly reward already owned; wait for an alternate reward configuration' using errcode='P0001';
  end if;

  insert into public.inventory_items(account_id,item_id,quantity) values(v_account,v_item,1);
  insert into public.hanami_plus_monthly_claims(account_id,claim_month,boutique_item_id,claimed_at) values(v_account,v_month,v_item,v_claimed);
  insert into public.hanami_plus_reward_history(account_id,reward_kind,title,description,boutique_item_id,occurred_at)
  values(v_account,'monthly_claim','Monthly Hanami+ cosmetic claimed','Claimed the rotating monthly Hanami+ cosmetic.',v_item,v_claimed);

  return query select v_item,v_name,v_claimed;
end;
$$;
revoke all on function public.claim_hanami_plus_monthly_reward() from public,anon;
grant execute on function public.claim_hanami_plus_monthly_reward() to authenticated;

create or replace function public.choose_hanami_plus_drop(p_offer_id uuid,p_item_id uuid)
returns table(item_id uuid,item_name text,chosen_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_name text;
  v_chosen timestamptz := now();
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_active_hanami_plus(v_account);

  if not exists(select 1 from public.hanami_plus_drop_offers o where o.id=p_offer_id and o.published=true and now() between o.starts_at and o.ends_at) then
    raise exception 'Hanami+ drop offer is unavailable' using errcode='P0002';
  end if;
  if not exists(select 1 from public.hanami_plus_drop_offer_items oi where oi.offer_id=p_offer_id and oi.boutique_item_id=p_item_id) then
    raise exception 'That cosmetic is not part of this drop offer' using errcode='22023';
  end if;
  if exists(select 1 from public.hanami_plus_drop_choices c where c.offer_id=p_offer_id and c.account_id=v_account) then
    raise exception 'You already chose a reward from this drop' using errcode='P0001';
  end if;
  if exists(select 1 from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id) then
    raise exception 'Selected cosmetic is already owned' using errcode='P0001';
  end if;

  select name into v_name from public.boutique_items where id=p_item_id and state='published' and item_type<>'hanami_plus_pass';
  if v_name is null then raise exception 'Selected cosmetic is unavailable' using errcode='P0002'; end if;

  insert into public.inventory_items(account_id,item_id,quantity) values(v_account,p_item_id,1);
  insert into public.hanami_plus_drop_choices(offer_id,account_id,boutique_item_id,chosen_at) values(p_offer_id,v_account,p_item_id,v_chosen);
  insert into public.hanami_plus_reward_history(account_id,reward_kind,title,description,boutique_item_id,metadata,occurred_at)
  values(v_account,'cosmetic_drop','Choose-your-drop reward claimed','Selected one cosmetic from a Hanami+ event drop.',p_item_id,jsonb_build_object('offer_id',p_offer_id::text),v_chosen);

  return query select p_item_id,v_name,v_chosen;
end;
$$;
revoke all on function public.choose_hanami_plus_drop(uuid,uuid) from public,anon;
grant execute on function public.choose_hanami_plus_drop(uuid,uuid) to authenticated;

create or replace function public.purchase_hanami_plus_loyalty_item(p_item_id uuid,p_request_id uuid)
returns table(balance integer,item_id uuid,item_name text)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_required_days integer;
  v_price integer;
  v_lifetime integer;
  v_name text;
  v_posted boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_active_hanami_plus(v_account);
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;

  select c.minimum_lifetime_days,c.price_petals,b.name into v_required_days,v_price,v_name
  from public.hanami_plus_loyalty_catalog c
  join public.boutique_items b on b.id=c.boutique_item_id and b.state='published'
  where c.boutique_item_id=p_item_id and c.state='published';
  if v_name is null then raise exception 'Loyalty cosmetic is unavailable' using errcode='P0002'; end if;

  select lifetime_plus_days into v_lifetime from public.hanami_plus_account_progress where account_id=v_account;
  if coalesce(v_lifetime,0)<v_required_days then raise exception 'More cumulative Hanami+ days are required' using errcode='42501'; end if;
  if exists(select 1 from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id) then
    raise exception 'Loyalty cosmetic already owned' using errcode='P0001';
  end if;

  v_posted := private.post_petal_entry(v_account,v_character,-v_price,'purchase','Purchased Hanami+ loyalty cosmetic','plus-loyalty:'||p_request_id::text,v_character,jsonb_build_object('item_id',p_item_id::text,'minimum_lifetime_days',v_required_days));
  if not v_posted then
    return query select w.balance,p_item_id,v_name from public.petal_wallets w where w.account_id=v_account;
    return;
  end if;

  insert into public.inventory_items(account_id,item_id,quantity) values(v_account,p_item_id,1);
  insert into public.hanami_plus_reward_history(account_id,reward_kind,title,description,boutique_item_id,metadata)
  values(v_account,'loyalty_purchase','Hanami+ loyalty cosmetic purchased','Unlocked through cumulative Hanami+ days and purchased with earned Petals.',p_item_id,jsonb_build_object('price_petals',v_price,'minimum_lifetime_days',v_required_days));

  return query select w.balance,p_item_id,v_name from public.petal_wallets w where w.account_id=v_account;
end;
$$;
revoke all on function public.purchase_hanami_plus_loyalty_item(uuid,uuid) from public,anon;
grant execute on function public.purchase_hanami_plus_loyalty_item(uuid,uuid) to authenticated;

commit;
