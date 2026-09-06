create table if not exists public.reward_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null,
  target_user_id uuid,
  item_id uuid references public.school_store_items(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.reward_admin_audit enable row level security;

create or replace function private.can_manage_exchange_catalog()
returns boolean
language sql stable security definer
set search_path=''
as $$
  select coalesce(public.current_owner_status(),false)
    or exists(select 1 from public.current_account_admin_access() a where a.site_admin or a.content_editor);
$$;

create or replace function private.can_grant_prestige_cosmetic()
returns boolean
language sql stable security definer
set search_path=''
as $$
  select coalesce(public.current_owner_status(),false)
    or exists(select 1 from public.current_account_admin_access() a where a.site_admin);
$$;

create or replace function private.validate_exchange_cosmetic_metadata(input jsonb)
returns boolean
language plpgsql immutable
set search_path=''
as $$
declare
  k text;
  v text;
begin
  input := coalesce(input,'{}'::jsonb);
  if jsonb_typeof(input) <> 'object' then return false; end if;
  for k in select jsonb_object_keys(input) loop
    if k not in ('accent','text','sidebar','surface','font','effect') then return false; end if;
  end loop;
  foreach k in array array['accent','text','sidebar','surface'] loop
    v := input->>k;
    if v is not null and v !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
  end loop;
  v := input->>'font';
  if v is not null and v not in ('classic','modern','rounded') then return false; end if;
  v := input->>'effect';
  if v is not null and v not in ('none','paper','petals','sparkle') then return false; end if;
  return true;
end;
$$;

create or replace function public.exchange_admin_catalog()
returns table(id uuid,slug text,label text,category text,description text,cost integer,rarity text,active boolean,cosmetic_slot text,bloom_required boolean,metadata jsonb)
language plpgsql security definer
set search_path=''
as $$
begin
  if not private.can_manage_exchange_catalog() then raise exception 'exchange management permission required'; end if;
  return query select s.id,s.slug,s.label,s.category,s.description,s.cost,s.rarity,s.active,s.cosmetic_slot,s.bloom_required,s.metadata
    from public.school_store_items s order by s.active desc,s.created_at desc,s.label;
end;
$$;

create or replace function public.exchange_admin_upsert_item(
  requested_item_id uuid,
  requested_slug text,
  requested_label text,
  requested_category text,
  requested_description text,
  requested_cost integer,
  requested_rarity text,
  requested_active boolean,
  requested_cosmetic_slot text,
  requested_bloom_required boolean,
  requested_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path=''
as $$
declare
  result_id uuid;
  clean_slug text := lower(trim(coalesce(requested_slug,'')));
  clean_label text := trim(coalesce(requested_label,''));
  clean_category text := lower(trim(coalesce(requested_category,'')));
  clean_rarity text := lower(trim(coalesce(requested_rarity,'')));
  clean_slot text := nullif(lower(trim(coalesce(requested_cosmetic_slot,''))), '');
begin
  if not private.can_manage_exchange_catalog() then raise exception 'exchange management permission required'; end if;
  if clean_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' then raise exception 'invalid item slug'; end if;
  if char_length(clean_label) < 2 or char_length(clean_label) > 80 then raise exception 'invalid item label'; end if;
  if requested_cost is null or requested_cost < 0 or requested_cost > 100000 then raise exception 'invalid Petal cost'; end if;
  if clean_category not in ('portal','profile','seasonal','prestige','collectible') then raise exception 'invalid item category'; end if;
  if clean_rarity not in ('common','uncommon','rare','epic','prestige') then raise exception 'invalid item rarity'; end if;
  if clean_slot is not null and clean_slot not in ('theme','accent','font','effect','decoration') then raise exception 'invalid cosmetic slot'; end if;
  if not private.validate_exchange_cosmetic_metadata(requested_metadata) then raise exception 'invalid cosmetic metadata'; end if;

  if requested_item_id is null then
    insert into public.school_store_items(slug,label,category,description,cost,rarity,active,cosmetic_slot,bloom_required,metadata)
    values(clean_slug,clean_label,clean_category,trim(coalesce(requested_description,'')),requested_cost,clean_rarity,coalesce(requested_active,false),clean_slot,coalesce(requested_bloom_required,false),coalesce(requested_metadata,'{}'::jsonb))
    returning id into result_id;
  else
    update public.school_store_items set slug=clean_slug,label=clean_label,category=clean_category,description=trim(coalesce(requested_description,'')),cost=requested_cost,rarity=clean_rarity,active=coalesce(requested_active,false),cosmetic_slot=clean_slot,bloom_required=coalesce(requested_bloom_required,false),metadata=coalesce(requested_metadata,'{}'::jsonb)
    where id=requested_item_id returning id into result_id;
    if result_id is null then raise exception 'exchange item not found'; end if;
  end if;
  insert into public.reward_admin_audit(actor_user_id,action,item_id,detail)
  values(auth.uid(),'exchange_item_upsert',result_id,jsonb_build_object('slug',clean_slug,'active',coalesce(requested_active,false)));
  return result_id;
end;
$$;

create or replace function public.exchange_admin_grant_prestige(target_discord_user_id text,target_item_id uuid,grant_note text default '')
returns boolean
language plpgsql security definer
set search_path=''
as $$
declare
  target_user uuid;
  item_ok boolean;
begin
  if not private.can_grant_prestige_cosmetic() then raise exception 'site administrator or Owner required'; end if;
  select r.user_id into target_user from public.account_discord_role_sync r where r.discord_user_id=trim(target_discord_user_id) limit 1;
  if target_user is null then raise exception 'Discord account is not linked to Hanami'; end if;
  select exists(select 1 from public.school_store_items s where s.id=target_item_id and (s.category='prestige' or s.rarity='prestige')) into item_ok;
  if not item_ok then raise exception 'item is not a prestige cosmetic'; end if;
  insert into public.account_store_ownership(user_id,item_id,acquired_source)
  values(target_user,target_item_id,'prestige_grant')
  on conflict (user_id,item_id) do nothing;
  insert into public.reward_admin_audit(actor_user_id,action,target_user_id,item_id,detail)
  values(auth.uid(),'prestige_grant',target_user,target_item_id,jsonb_build_object('note',left(coalesce(grant_note,''),500)));
  return true;
end;
$$;

create or replace function public.owner_bloom_configuration()
returns table(discord_role_id text)
language plpgsql security definer
set search_path=''
as $$
begin
  if not coalesce(public.current_owner_status(),false) then raise exception 'Owner required'; end if;
  return query select c.value from public.portal_authorization_config c where c.key='hanami_bloom_discord_role_id' limit 1;
end;
$$;

create or replace function public.owner_set_bloom_discord_role(requested_role_id text)
returns void
language plpgsql security definer
set search_path=''
as $$
declare clean text := nullif(trim(coalesce(requested_role_id,'')),'');
begin
  if not coalesce(public.current_owner_status(),false) then raise exception 'Owner required'; end if;
  if clean is not null and clean !~ '^[0-9]{5,30}$' then raise exception 'invalid Discord role ID'; end if;
  if clean is null then
    delete from public.portal_authorization_config where key='hanami_bloom_discord_role_id';
    delete from public.account_entitlements where entitlement_key='hanami_bloom' and source_type='discord_role';
  else
    insert into public.portal_authorization_config(key,value,updated_at) values('hanami_bloom_discord_role_id',clean,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;
    perform private.refresh_hanami_bloom_entitlements();
  end if;
  insert into public.reward_admin_audit(actor_user_id,action,detail) values(auth.uid(),'bloom_role_config',jsonb_build_object('configured',clean is not null));
end;
$$;

create or replace function public.owner_refresh_bloom_entitlements()
returns void
language plpgsql security definer
set search_path=''
as $$
begin
  if not coalesce(public.current_owner_status(),false) then raise exception 'Owner required'; end if;
  perform private.refresh_hanami_bloom_entitlements();
  insert into public.reward_admin_audit(actor_user_id,action) values(auth.uid(),'bloom_entitlement_refresh');
end;
$$;

revoke all on function public.exchange_admin_catalog() from public,anon;
revoke all on function public.exchange_admin_upsert_item(uuid,text,text,text,text,integer,text,boolean,text,boolean,jsonb) from public,anon;
revoke all on function public.exchange_admin_grant_prestige(text,uuid,text) from public,anon;
revoke all on function public.owner_bloom_configuration() from public,anon;
revoke all on function public.owner_set_bloom_discord_role(text) from public,anon;
revoke all on function public.owner_refresh_bloom_entitlements() from public,anon;
grant execute on function public.exchange_admin_catalog() to authenticated;
grant execute on function public.exchange_admin_upsert_item(uuid,text,text,text,text,integer,text,boolean,text,boolean,jsonb) to authenticated;
grant execute on function public.exchange_admin_grant_prestige(text,uuid,text) to authenticated;
grant execute on function public.owner_bloom_configuration() to authenticated;
grant execute on function public.owner_set_bloom_discord_role(text) to authenticated;
grant execute on function public.owner_refresh_bloom_entitlements() to authenticated;
