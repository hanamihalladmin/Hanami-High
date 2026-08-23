create or replace function public.character_roleplay_self_checkin(target_session_id uuid, target_character_id uuid)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  session_state text;
begin
  if not private.user_owns_character(target_character_id) then
    raise exception 'You can only check in a character owned by your account.';
  end if;

  select status into session_state
  from public.roleplay_sessions
  where id = target_session_id;

  if session_state is null then
    raise exception 'Roleplay session not found.';
  end if;

  if session_state not in ('active','closing') then
    raise exception 'This roleplay session is not open for check-in.';
  end if;

  insert into public.roleplay_session_participation(session_id,character_id,status,checked_in_at,confirmed_at,confirmed_by,staff_note,updated_at)
  values(target_session_id,target_character_id,'checked_in',now(),null,null,'',now())
  on conflict (session_id,character_id) do update
  set status = case when roleplay_session_participation.status='confirmed' then 'confirmed' else 'checked_in' end,
      checked_in_at = coalesce(roleplay_session_participation.checked_in_at,now()),
      updated_at = now();

  return case
    when exists(select 1 from public.roleplay_session_participation where session_id=target_session_id and character_id=target_character_id and status='confirmed')
      then 'already_confirmed'
    else 'checked_in'
  end;
end;
$$;

create or replace function public.character_roleplay_checkin_feed(viewer_character_id uuid)
returns table(session_id uuid,session_title text,session_code text,session_status text,participation_status text,checked_in_at timestamptz,confirmed_at timestamptz)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.user_owns_character(viewer_character_id) then
    raise exception 'Character does not belong to the current account.';
  end if;

  return query
  select s.id,s.title,s.code,s.status,coalesce(p.status,'not_checked_in'),p.checked_in_at,p.confirmed_at
  from public.roleplay_sessions s
  left join public.roleplay_session_participation p
    on p.session_id=s.id and p.character_id=viewer_character_id
  where s.status in ('active','closing')
  order by s.created_at desc
  limit 10;
end;
$$;

revoke all on function public.character_roleplay_self_checkin(uuid,uuid) from public,anon;
revoke all on function public.character_roleplay_checkin_feed(uuid) from public,anon;
grant execute on function public.character_roleplay_self_checkin(uuid,uuid) to authenticated;
grant execute on function public.character_roleplay_checkin_feed(uuid) to authenticated;
