begin;

create table if not exists private.owner_web_edit_sessions (
  token_hash text primary key,
  credential_id uuid not null references public.privileged_portal_credentials(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists owner_web_edit_sessions_expires_idx on private.owner_web_edit_sessions(expires_at);

create table if not exists private.owner_web_edit_login_attempts (
  handle text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);
revoke all on table private.owner_web_edit_sessions from public,anon,authenticated;
revoke all on table private.owner_web_edit_login_attempts from public,anon,authenticated;

create or replace function public.owner_web_edit_login(requested_handle text,requested_password text)
returns text language plpgsql security definer set search_path='' as $$
declare
  clean_handle text:=lower(trim(coalesce(requested_handle,'')));
  cred public.privileged_portal_credentials;
  attempt private.owner_web_edit_login_attempts;
  raw_token text;
  next_failed integer;
begin
  if clean_handle !~ '^[a-z0-9_]{3,32}$' or requested_password is null or length(requested_password)>256 then return null; end if;
  select * into attempt from private.owner_web_edit_login_attempts where handle=clean_handle;
  if attempt.locked_until is not null and attempt.locked_until>now() then return null; end if;
  select * into cred from public.privileged_portal_credentials where portal_kind='owner' and handle=clean_handle and is_active=true limit 1;
  if cred.id is null or extensions.crypt(requested_password,cred.password_hash)<>cred.password_hash then
    next_failed:=coalesce(attempt.failed_count,0)+1;
    insert into private.owner_web_edit_login_attempts(handle,failed_count,locked_until,updated_at)
    values(clean_handle,next_failed,case when next_failed>=5 then now()+interval '15 minutes' else null end,now())
    on conflict(handle) do update set failed_count=excluded.failed_count,locked_until=excluded.locked_until,updated_at=excluded.updated_at;
    return null;
  end if;
  delete from private.owner_web_edit_login_attempts where handle=clean_handle;
  delete from private.owner_web_edit_sessions where expires_at<=now();
  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.owner_web_edit_sessions(token_hash,credential_id,expires_at)
  values(encode(extensions.digest(raw_token,'sha256'),'hex'),cred.id,now()+interval '8 hours');
  return raw_token;
end;$$;

create or replace function public.owner_web_edit_session_valid(requested_token text)
returns boolean language plpgsql security definer set search_path='' as $$
declare hashed text; valid_session boolean;
begin
  if requested_token is null or requested_token !~ '^[0-9a-f]{64}$' then return false; end if;
  hashed:=encode(extensions.digest(requested_token,'sha256'),'hex');
  select exists(select 1 from private.owner_web_edit_sessions s join public.privileged_portal_credentials c on c.id=s.credential_id where s.token_hash=hashed and s.expires_at>now() and c.portal_kind='owner' and c.is_active=true) into valid_session;
  if valid_session then update private.owner_web_edit_sessions set last_used_at=now() where token_hash=hashed; end if;
  return valid_session;
end;$$;

create or replace function public.owner_web_edit_logout(requested_token text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if requested_token is not null and requested_token ~ '^[0-9a-f]{64}$' then delete from private.owner_web_edit_sessions where token_hash=encode(extensions.digest(requested_token,'sha256'),'hex'); end if;
end;$$;

create or replace function public.owner_web_save_public_page_text(requested_token text,requested_page_path text,requested_block_key text,requested_content text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.owner_web_edit_session_valid(requested_token) then raise exception 'Owner website edit session required'; end if;
  if requested_page_path is null or requested_page_path !~ '^/[a-z0-9/_-]*$' then raise exception 'Invalid page path'; end if;
  if requested_block_key is null or requested_block_key !~ '^[a-z0-9._-]{1,120}$' then raise exception 'Invalid block key'; end if;
  if requested_content is null or char_length(requested_content)>12000 then raise exception 'Invalid content'; end if;
  insert into public.public_page_text_blocks(page_path,block_key,content,updated_by,updated_at)
  values(requested_page_path,requested_block_key,requested_content,null,now())
  on conflict(page_path,block_key) do update set content=excluded.content,updated_by=null,updated_at=now();
end;$$;

create or replace function public.owner_web_delete_public_page_text(requested_token text,requested_page_path text,requested_block_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.owner_web_edit_session_valid(requested_token) then raise exception 'Owner website edit session required'; end if;
  delete from public.public_page_text_blocks where page_path=requested_page_path and block_key=requested_block_key;
end;$$;

revoke all on function public.owner_web_edit_login(text,text) from public;
revoke all on function public.owner_web_edit_session_valid(text) from public;
revoke all on function public.owner_web_edit_logout(text) from public;
revoke all on function public.owner_web_save_public_page_text(text,text,text,text) from public;
revoke all on function public.owner_web_delete_public_page_text(text,text,text) from public;
grant execute on function public.owner_web_edit_login(text,text) to anon,authenticated;
grant execute on function public.owner_web_edit_session_valid(text) to anon,authenticated;
grant execute on function public.owner_web_edit_logout(text) to anon,authenticated;
grant execute on function public.owner_web_save_public_page_text(text,text,text,text) to anon,authenticated;
grant execute on function public.owner_web_delete_public_page_text(text,text,text) to anon,authenticated;

commit;
