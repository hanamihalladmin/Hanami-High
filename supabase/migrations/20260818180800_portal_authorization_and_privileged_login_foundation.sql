create extension if not exists pgcrypto;

create table if not exists public.portal_authorization_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.portal_authorization_config enable row level security;
revoke all on public.portal_authorization_config from anon,authenticated;

insert into public.portal_authorization_config(key,value) values
 ('student_discord_role_id','1534706083010969691'),
 ('faculty_discord_role_id','1532448584052510950'),
 ('administrator_discord_role_id_1','1532448584069546090'),
 ('administrator_discord_role_id_2','1532448584069546091'),
 ('owner_discord_user_id','974361056451379210')
on conflict(key) do update set value=excluded.value,updated_at=now();

create table if not exists public.privileged_portal_credentials (
  id uuid primary key default gen_random_uuid(),
  portal_kind text not null check (portal_kind in ('administrator','owner')),
  handle text not null check (handle ~ '^[a-z0-9_]{3,32}$'),
  password_hash text not null,
  bound_discord_user_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(portal_kind,handle)
);
alter table public.privileged_portal_credentials enable row level security;
revoke all on public.privileged_portal_credentials from anon,authenticated;

create table if not exists public.privileged_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portal_kind text not null check (portal_kind in ('administrator','owner')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id,portal_kind)
);
alter table public.privileged_portal_sessions enable row level security;
revoke all on public.privileged_portal_sessions from anon,authenticated;

create or replace function private.current_discord_user_id()
returns text language sql stable security definer set search_path=auth as $$
 select coalesce(u.raw_user_meta_data->>'provider_id',u.raw_user_meta_data->>'sub') from auth.users u where u.id=auth.uid();
$$;
revoke all on function private.current_discord_user_id() from public,anon;
grant execute on function private.current_discord_user_id() to authenticated;

create or replace function private.is_owner_discord_user()
returns boolean language sql stable security definer set search_path=public,private as $$
 select private.current_discord_user_id()=(select value from public.portal_authorization_config where key='owner_discord_user_id');
$$;
revoke all on function private.is_owner_discord_user() from public,anon;
grant execute on function private.is_owner_discord_user() to authenticated;

create or replace function public.current_owner_status()
returns boolean language sql stable security invoker set search_path=private as $$ select private.is_owner_discord_user(); $$;
revoke all on function public.current_owner_status() from public,anon;
grant execute on function public.current_owner_status() to authenticated;

create or replace function private.verify_privileged_portal_login_internal(requested_portal text,requested_handle text,requested_password text)
returns boolean language plpgsql security definer set search_path=public,private,auth as $$
declare cred public.privileged_portal_credentials; discord_id text;
begin
 if requested_portal not in ('administrator','owner') then return false; end if;
 discord_id:=private.current_discord_user_id();
 select * into cred from public.privileged_portal_credentials where portal_kind=requested_portal and handle=lower(trim(requested_handle)) and is_active=true limit 1;
 if cred.id is null then return false; end if;
 if cred.bound_discord_user_id is not null and cred.bound_discord_user_id<>discord_id then return false; end if;
 if requested_portal='owner' and not private.is_owner_discord_user() then return false; end if;
 if crypt(requested_password,cred.password_hash)<>cred.password_hash then return false; end if;
 insert into public.privileged_portal_sessions(user_id,portal_kind,expires_at) values(auth.uid(),requested_portal,now()+interval '8 hours') on conflict(user_id,portal_kind) do update set expires_at=excluded.expires_at,created_at=now();
 return true;
end;$$;
revoke all on function private.verify_privileged_portal_login_internal(text,text,text) from public,anon;
grant execute on function private.verify_privileged_portal_login_internal(text,text,text) to authenticated;

create or replace function public.verify_privileged_portal_login(requested_portal text,requested_handle text,requested_password text)
returns boolean language sql security invoker set search_path=private as $$ select private.verify_privileged_portal_login_internal(requested_portal,requested_handle,requested_password); $$;
revoke all on function public.verify_privileged_portal_login(text,text,text) from public,anon;
grant execute on function public.verify_privileged_portal_login(text,text,text) to authenticated;

create or replace function private.has_privileged_portal_session_internal(requested_portal text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.privileged_portal_sessions s where s.user_id=auth.uid() and s.portal_kind=requested_portal and s.expires_at>now());
$$;
revoke all on function private.has_privileged_portal_session_internal(text) from public,anon;
grant execute on function private.has_privileged_portal_session_internal(text) to authenticated;

create or replace function public.has_privileged_portal_session(requested_portal text)
returns boolean language sql stable security invoker set search_path=private as $$ select private.has_privileged_portal_session_internal(requested_portal); $$;
revoke all on function public.has_privileged_portal_session(text) from public,anon;
grant execute on function public.has_privileged_portal_session(text) to authenticated;

create or replace function public.end_privileged_portal_session(requested_portal text)
returns void language plpgsql security definer set search_path=public as $$ begin delete from public.privileged_portal_sessions where user_id=auth.uid() and portal_kind=requested_portal; end;$$;
revoke all on function public.end_privileged_portal_session(text) from public,anon;
grant execute on function public.end_privileged_portal_session(text) to authenticated;
