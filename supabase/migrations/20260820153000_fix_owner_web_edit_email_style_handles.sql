create or replace function public.owner_web_edit_login(requested_handle text,requested_password text)
returns text language plpgsql security definer set search_path='' as $$
declare
  clean_handle text:=lower(trim(coalesce(requested_handle,'')));
  cred public.privileged_portal_credentials;
  attempt private.owner_web_edit_login_attempts;
  raw_token text;
  next_failed integer;
begin
  if clean_handle ~ '@hanamihigh\.edu$' then
    clean_handle:=left(clean_handle,length(clean_handle)-length('@hanamihigh.edu'));
  end if;
  clean_handle:=ltrim(clean_handle,'@');
  if clean_handle !~ '^[a-z0-9_]{3,32}$' or requested_password is null or length(requested_password)>256 then return null; end if;

  select * into attempt from private.owner_web_edit_login_attempts where handle=clean_handle;
  if attempt.locked_until is not null and attempt.locked_until>now() then return null; end if;

  select * into cred
  from public.privileged_portal_credentials
  where portal_kind='owner'
    and is_active=true
    and lower(trim(handle)) in (clean_handle,clean_handle||'@hanamihigh.edu')
  order by case when lower(trim(handle))=clean_handle then 0 else 1 end
  limit 1;

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

revoke all on function public.owner_web_edit_login(text,text) from public;
grant execute on function public.owner_web_edit_login(text,text) to anon,authenticated;
