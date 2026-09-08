begin;

create table public.account_lockscreens (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  pin_hash text,
  pin_issued_at timestamptz,
  pin_issued_by_account_id uuid references public.accounts(id) on delete set null,
  wallpaper_path text,
  wallpaper_updated_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_lockscreens enable row level security;
revoke all on public.account_lockscreens from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lockscreen-wallpapers','lockscreen-wallpapers',false,8388608,array['image/jpeg','image/png','image/webp','image/gif']::text[])
on conflict(id) do update set name=excluded.name,public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy lockscreen_wallpaper_insert_own on storage.objects for insert to authenticated with check(
  bucket_id='lockscreen-wallpapers' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy lockscreen_wallpaper_select_own on storage.objects for select to authenticated using(
  bucket_id='lockscreen-wallpapers' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy lockscreen_wallpaper_delete_own on storage.objects for delete to authenticated using(
  bucket_id='lockscreen-wallpapers' and (storage.foldername(name))[1]=(select auth.uid())::text
);

create or replace function public.my_lockscreen_status()
returns table(lock_enabled boolean,wallpaper_path text,pin_issued_at timestamptz,locked_until timestamptz)
language sql stable security definer set search_path='' as $$
  select (l.pin_hash is not null),l.wallpaper_path,l.pin_issued_at,l.locked_until
  from (select (select auth.uid()) as account_id) me
  left join public.account_lockscreens l on l.account_id=me.account_id;
$$;
revoke all on function public.my_lockscreen_status() from public,anon;
grant execute on function public.my_lockscreen_status() to authenticated;

create or replace function public.verify_my_lockscreen_pin(p_pin text)
returns boolean
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_row public.account_lockscreens%rowtype;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_row from public.account_lockscreens where account_id=v_account for update;
  if not found or v_row.pin_hash is null then return true; end if;
  if v_row.locked_until is not null and v_row.locked_until>now() then raise exception 'Too many incorrect PIN attempts. Try again later.' using errcode='P0001'; end if;
  if coalesce(p_pin,'') ~ '^[0-9]{6}$' and extensions.crypt(p_pin,v_row.pin_hash)=v_row.pin_hash then
    update public.account_lockscreens set failed_attempts=0,locked_until=null,updated_at=now() where account_id=v_account;
    return true;
  end if;
  update public.account_lockscreens
  set failed_attempts=failed_attempts+1,
      locked_until=case when failed_attempts+1>=5 then now()+interval '10 minutes' else null end,
      updated_at=now()
  where account_id=v_account;
  return false;
end;
$$;
revoke all on function public.verify_my_lockscreen_pin(text) from public,anon;
grant execute on function public.verify_my_lockscreen_pin(text) to authenticated;

create or replace function public.set_my_lockscreen_wallpaper(p_path text)
returns boolean
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_path text := nullif(trim(coalesce(p_path,'')),'');
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_path is not null and split_part(v_path,'/',1)<>v_account::text then raise exception 'Invalid wallpaper path' using errcode='22023'; end if;
  insert into public.account_lockscreens(account_id,wallpaper_path,wallpaper_updated_at)
  values(v_account,v_path,case when v_path is null then null else now() end)
  on conflict(account_id) do update set wallpaper_path=excluded.wallpaper_path,wallpaper_updated_at=excluded.wallpaper_updated_at,updated_at=now();
  return true;
end;
$$;
revoke all on function public.set_my_lockscreen_wallpaper(text) from public,anon;
grant execute on function public.set_my_lockscreen_wallpaper(text) to authenticated;

create or replace function public.owner_account_lockscreen_statuses()
returns table(account_id uuid,discord_username text,lock_enabled boolean,pin_issued_at timestamptz,wallpaper_configured boolean,locked_until timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then raise exception 'Account management access required' using errcode='42501'; end if;
  return query
  select a.id,a.discord_username,(l.pin_hash is not null),l.pin_issued_at,(l.wallpaper_path is not null),l.locked_until
  from public.accounts a left join public.account_lockscreens l on l.account_id=a.id
  order by lower(coalesce(a.discord_username,'')),a.created_at;
end;
$$;
revoke all on function public.owner_account_lockscreen_statuses() from public,anon;
grant execute on function public.owner_account_lockscreen_statuses() to authenticated;

create or replace function public.owner_generate_account_lockscreen_pin(p_account_id uuid)
returns text
language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := (select auth.uid());
  v_bytes bytea;
  v_pin text := '';
  i integer;
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then raise exception 'Account management access required' using errcode='42501'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id) then raise exception 'Account not found' using errcode='P0002'; end if;
  v_bytes := extensions.gen_random_bytes(6);
  for i in 0..5 loop v_pin := v_pin || ((get_byte(v_bytes,i)%10)::text); end loop;
  insert into public.account_lockscreens(account_id,pin_hash,pin_issued_at,pin_issued_by_account_id,failed_attempts,locked_until)
  values(p_account_id,extensions.crypt(v_pin,extensions.gen_salt('bf',10)),now(),v_actor,0,null)
  on conflict(account_id) do update set pin_hash=excluded.pin_hash,pin_issued_at=excluded.pin_issued_at,pin_issued_by_account_id=v_actor,failed_attempts=0,locked_until=null,updated_at=now();
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata)
  values(v_actor,'owner.lockscreen_pin_generated','account',p_account_id::text,jsonb_build_object('rotated',true));
  return v_pin;
end;
$$;
revoke all on function public.owner_generate_account_lockscreen_pin(uuid) from public,anon;
grant execute on function public.owner_generate_account_lockscreen_pin(uuid) to authenticated;

create or replace function public.owner_disable_account_lockscreen(p_account_id uuid)
returns boolean
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then raise exception 'Account management access required' using errcode='42501'; end if;
  insert into public.account_lockscreens(account_id) values(p_account_id) on conflict(account_id) do update set pin_hash=null,pin_issued_at=null,pin_issued_by_account_id=null,failed_attempts=0,locked_until=null,updated_at=now();
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.lockscreen_disabled','account',p_account_id::text,'{}'::jsonb);
  return true;
end;
$$;
revoke all on function public.owner_disable_account_lockscreen(uuid) from public,anon;
grant execute on function public.owner_disable_account_lockscreen(uuid) to authenticated;

commit;
