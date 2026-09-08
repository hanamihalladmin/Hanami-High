-- Repair Boutique purchases and add Hanami+ account-wide custom site colors.

alter table public.account_preferences
  add column if not exists custom_theme_enabled boolean not null default false,
  add column if not exists custom_theme_ink text,
  add column if not exists custom_theme_soft text,
  add column if not exists custom_theme_paper text,
  add column if not exists custom_theme_accent text;

alter table public.account_preferences
  drop constraint if exists account_preferences_custom_theme_ink_check,
  add constraint account_preferences_custom_theme_ink_check check (custom_theme_ink is null or custom_theme_ink ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_soft_check,
  add constraint account_preferences_custom_theme_soft_check check (custom_theme_soft is null or custom_theme_soft ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_paper_check,
  add constraint account_preferences_custom_theme_paper_check check (custom_theme_paper is null or custom_theme_paper ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_accent_check,
  add constraint account_preferences_custom_theme_accent_check check (custom_theme_accent is null or custom_theme_accent ~ '^#[0-9A-Fa-f]{6}$');

create or replace function public.set_my_custom_site_theme(
  p_enabled boolean,
  p_ink text default null,
  p_soft text default null,
  p_paper text default null,
  p_accent text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := auth.uid();
  v_hex constant text := '^#[0-9A-Fa-f]{6}$';
begin
  if v_account is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_enabled and not private.has_active_plus_for_account(v_account) then
    raise exception 'Active Hanami+ is required for custom website colors' using errcode='42501';
  end if;

  if p_enabled then
    if p_ink !~ v_hex or p_soft !~ v_hex or p_paper !~ v_hex or p_accent !~ v_hex then
      raise exception 'Custom colors must use six-digit hex values' using errcode='22023';
    end if;
  end if;

  update public.account_preferences
  set custom_theme_enabled = p_enabled,
      custom_theme_ink = case when p_enabled then lower(p_ink) else custom_theme_ink end,
      custom_theme_soft = case when p_enabled then lower(p_soft) else custom_theme_soft end,
      custom_theme_paper = case when p_enabled then lower(p_paper) else custom_theme_paper end,
      custom_theme_accent = case when p_enabled then lower(p_accent) else custom_theme_accent end,
      updated_at = now()
  where account_id = v_account;

  return found;
end;
$$;

revoke all on function public.set_my_custom_site_theme(boolean,text,text,text,text) from public;
grant execute on function public.set_my_custom_site_theme(boolean,text,text,text,text) to authenticated;

create or replace function private.purchase_boutique_item_impl(p_item_id uuid, p_request_id uuid)
returns table(balance integer, item_id uuid, quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := auth.uid();
  v_character uuid;
  v_item public.boutique_items%rowtype;
  v_existing integer;
  v_now timestamptz := now();
  v_start timestamptz;
  v_end timestamptz;
  v_posted boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  select b.* into v_item from public.boutique_items b where b.id=p_item_id and b.state='published';
  if not found then raise exception 'Boutique item is unavailable' using errcode='P0002'; end if;
  select i.quantity into v_existing from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id;
  if v_existing is not null and v_item.item_type<>'hanami_plus_pass' then raise exception 'Item already owned' using errcode='P0001'; end if;

  v_posted := private.post_petal_entry(v_account,v_character,-v_item.price_petals,'purchase','Purchased '||v_item.name,'purchase:'||p_request_id::text,v_character,jsonb_build_object('item_id',p_item_id::text,'item_slug',v_item.slug));
  if not v_posted then
    return query
      select w.balance,p_item_id,coalesce(i.quantity,0)
      from public.petal_wallets w
      left join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id
      where w.account_id=v_account;
    return;
  end if;

  insert into public.inventory_items(account_id,item_id,quantity)
  values(v_account,p_item_id,1)
  on conflict on constraint inventory_items_pkey
  do update set quantity=public.inventory_items.quantity+1,updated_at=now();

  if v_item.item_type='hanami_plus_pass' then
    select greatest(v_now,coalesce(e.ends_at,v_now)) into v_start
    from public.hanami_plus_entitlements e where e.account_id=v_account;
    v_start := coalesce(v_start,v_now);
    v_end := v_start + make_interval(days=>v_item.pass_days);
    insert into public.hanami_plus_entitlements(account_id,starts_at,ends_at,source_item_id)
    values(v_account,v_now,v_end,p_item_id)
    on conflict(account_id) do update
      set ends_at=v_end,source_item_id=p_item_id,updated_at=now();
  end if;

  return query
    select w.balance,p_item_id,i.quantity
    from public.petal_wallets w
    join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id
    where w.account_id=v_account;
end;
$$;
