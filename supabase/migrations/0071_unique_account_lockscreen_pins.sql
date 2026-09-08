begin;

create or replace function public.owner_generate_account_lockscreen_pin(p_account_id uuid)
returns text
language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := (select auth.uid());
  v_bytes bytea;
  v_pin text;
  v_attempt integer := 0;
  i integer;
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then
    raise exception 'Account management access required' using errcode='42501';
  end if;
  if not exists(select 1 from public.accounts where id=p_account_id) then
    raise exception 'Account not found' using errcode='P0002';
  end if;

  -- Serialize PIN generation so two Owner actions cannot race into the same six-digit PIN.
  perform pg_advisory_xact_lock(hashtext('hanami-account-lockscreen-pin-generator'));

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 250 then
      raise exception 'Unable to generate a unique PIN. Please try again.' using errcode='P0001';
    end if;

    v_bytes := extensions.gen_random_bytes(6);
    v_pin := '';
    for i in 0..5 loop
      v_pin := v_pin || ((get_byte(v_bytes,i)%10)::text);
    end loop;

    -- Compare against every currently issued bcrypt hash without storing plaintext
    -- or a reversible deterministic PIN value anywhere in the database.
    exit when not exists(
      select 1
      from public.account_lockscreens l
      where l.pin_hash is not null
        and extensions.crypt(v_pin,l.pin_hash)=l.pin_hash
    );
  end loop;

  insert into public.account_lockscreens(
    account_id,pin_hash,pin_issued_at,pin_issued_by_account_id,failed_attempts,locked_until
  )
  values(
    p_account_id,extensions.crypt(v_pin,extensions.gen_salt('bf',10)),now(),v_actor,0,null
  )
  on conflict(account_id) do update set
    pin_hash=excluded.pin_hash,
    pin_issued_at=excluded.pin_issued_at,
    pin_issued_by_account_id=v_actor,
    failed_attempts=0,
    locked_until=null,
    updated_at=now();

  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata)
  values(
    v_actor,
    'owner.lockscreen_pin_generated',
    'account',
    p_account_id::text,
    jsonb_build_object('rotated',true,'unique_across_active_pins',true)
  );

  return v_pin;
end;
$$;

revoke all on function public.owner_generate_account_lockscreen_pin(uuid) from public,anon;
grant execute on function public.owner_generate_account_lockscreen_pin(uuid) to authenticated;

commit;
