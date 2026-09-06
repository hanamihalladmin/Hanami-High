create table if not exists public.petal_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.petal_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists petal_transactions_user_created_idx on public.petal_transactions(user_id, created_at desc);

alter table public.school_store_items
  add column if not exists cosmetic_slot text,
  add column if not exists bloom_required boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.account_store_ownership (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.school_store_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  acquired_source text not null default 'exchange',
  primary key (user_id, item_id)
);

create table if not exists public.character_equipped_store_items (
  character_id uuid not null references public.characters(id) on delete cascade,
  slot text not null,
  item_id uuid not null references public.school_store_items(id) on delete cascade,
  equipped_at timestamptz not null default now(),
  primary key (character_id, slot)
);
create index if not exists character_equipped_store_items_item_idx on public.character_equipped_store_items(item_id);

create table if not exists public.account_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  source_type text not null,
  source_ref text,
  granted_at timestamptz not null default now(),
  primary key (user_id, entitlement_key)
);

alter table public.petal_wallets enable row level security;
alter table public.petal_transactions enable row level security;
alter table public.account_store_ownership enable row level security;
alter table public.character_equipped_store_items enable row level security;
alter table public.account_entitlements enable row level security;

revoke all on public.petal_wallets from anon, authenticated;
revoke all on public.petal_transactions from anon, authenticated;
revoke all on public.account_store_ownership from anon, authenticated;
revoke all on public.character_equipped_store_items from anon, authenticated;
revoke all on public.account_entitlements from anon, authenticated;

grant select on public.petal_wallets to authenticated;
grant select on public.petal_transactions to authenticated;
grant select on public.account_store_ownership to authenticated;
grant select, insert, update, delete on public.character_equipped_store_items to authenticated;
grant select on public.account_entitlements to authenticated;
grant select on public.school_store_items to authenticated;

drop policy if exists petal_wallet_self on public.petal_wallets;
create policy petal_wallet_self on public.petal_wallets for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists petal_transactions_self on public.petal_transactions;
create policy petal_transactions_self on public.petal_transactions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists account_store_ownership_self on public.account_store_ownership;
create policy account_store_ownership_self on public.account_store_ownership for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists account_entitlements_self on public.account_entitlements;
create policy account_entitlements_self on public.account_entitlements for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists character_equipped_store_items_select on public.character_equipped_store_items;
create policy character_equipped_store_items_select on public.character_equipped_store_items for select to authenticated using (
  exists (select 1 from public.characters c where c.id = character_id and c.owner_user_id = (select auth.uid()))
);

drop policy if exists character_equipped_store_items_insert on public.character_equipped_store_items;
create policy character_equipped_store_items_insert on public.character_equipped_store_items for insert to authenticated with check (
  exists (select 1 from public.characters c where c.id = character_id and c.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.account_store_ownership o join public.characters c2 on c2.owner_user_id = o.user_id where o.item_id = character_equipped_store_items.item_id and c2.id = character_equipped_store_items.character_id and c2.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.school_store_items i where i.id = item_id and i.active and (i.cosmetic_slot is null or i.cosmetic_slot = slot))
);

drop policy if exists character_equipped_store_items_update on public.character_equipped_store_items;
create policy character_equipped_store_items_update on public.character_equipped_store_items for update to authenticated using (
  exists (select 1 from public.characters c where c.id = character_id and c.owner_user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.characters c where c.id = character_id and c.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.account_store_ownership o join public.characters c2 on c2.owner_user_id = o.user_id where o.item_id = character_equipped_store_items.item_id and c2.id = character_equipped_store_items.character_id and c2.owner_user_id = (select auth.uid()))
  and exists (select 1 from public.school_store_items i where i.id = item_id and i.active and (i.cosmetic_slot is null or i.cosmetic_slot = slot))
);

drop policy if exists character_equipped_store_items_delete on public.character_equipped_store_items;
create policy character_equipped_store_items_delete on public.character_equipped_store_items for delete to authenticated using (
  exists (select 1 from public.characters c where c.id = character_id and c.owner_user_id = (select auth.uid()))
);

create or replace function public.ensure_current_petal_wallet()
returns public.petal_wallets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.petal_wallets;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.petal_wallets(user_id) values (uid) on conflict (user_id) do nothing;
  select * into result from public.petal_wallets where user_id = uid;
  return result;
end;
$$;
revoke execute on function public.ensure_current_petal_wallet() from public, anon;
grant execute on function public.ensure_current_petal_wallet() to authenticated;

grant insert on public.petal_wallets to authenticated;
drop policy if exists petal_wallet_create_self on public.petal_wallets;
create policy petal_wallet_create_self on public.petal_wallets for insert to authenticated with check ((select auth.uid()) = user_id and balance = 0 and lifetime_earned = 0);

create schema if not exists private;

create or replace function private.purchase_exchange_item(target_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  item public.school_store_items;
  wallet public.petal_wallets;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into item from public.school_store_items where id = target_item_id and active for share;
  if item.id is null then raise exception 'Exchange item is unavailable'; end if;

  if item.bloom_required and not exists (
    select 1 from public.account_entitlements e where e.user_id = uid and e.entitlement_key = 'hanami_bloom'
  ) then
    raise exception 'Hanami Bloom entitlement required';
  end if;

  if exists (select 1 from public.account_store_ownership o where o.user_id = uid and o.item_id = target_item_id) then
    return jsonb_build_object('ok', true, 'owned', true, 'balance', coalesce((select balance from public.petal_wallets where user_id = uid), 0));
  end if;

  insert into public.petal_wallets(user_id) values (uid) on conflict (user_id) do nothing;
  select * into wallet from public.petal_wallets where user_id = uid for update;
  if wallet.balance < item.cost then raise exception 'Not enough Petals'; end if;

  update public.petal_wallets set balance = balance - item.cost, updated_at = now() where user_id = uid returning * into wallet;
  insert into public.account_store_ownership(user_id,item_id,acquired_source) values (uid,target_item_id,'exchange');
  insert into public.petal_transactions(user_id,amount,reason,source_type,source_id) values (uid,-item.cost,'Hanami Exchange purchase','exchange',target_item_id);
  return jsonb_build_object('ok', true, 'owned', true, 'balance', wallet.balance);
end;
$$;
revoke all on function private.purchase_exchange_item(uuid) from public, anon;
grant execute on function private.purchase_exchange_item(uuid) to authenticated;
grant usage on schema private to authenticated;

create or replace function public.purchase_exchange_item(target_item_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.purchase_exchange_item(target_item_id); $$;
revoke execute on function public.purchase_exchange_item(uuid) from public, anon;
grant execute on function public.purchase_exchange_item(uuid) to authenticated;
