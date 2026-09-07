grant usage on schema private to authenticated;

create or replace function private.claim_daily_petals_impl()
returns table(balance integer,awarded integer)
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_awarded boolean; v_day date;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  v_day := (now() at time zone 'Asia/Tokyo')::date;
  v_awarded := private.post_petal_entry(v_account,v_character,5,'daily_login','Daily Hanami login','daily:'||v_account::text||':'||v_day::text,null,jsonb_build_object('tokyo_day',v_day::text));
  return query select w.balance,case when v_awarded then 5 else 0 end from public.petal_wallets w where w.account_id=v_account;
end;
$$;
revoke all on function private.claim_daily_petals_impl() from public,anon;
grant execute on function private.claim_daily_petals_impl() to authenticated;

create or replace function public.claim_daily_petals()
returns table(balance integer,awarded integer)
language sql security invoker set search_path='' as $$ select * from private.claim_daily_petals_impl(); $$;
revoke all on function public.claim_daily_petals() from public,anon;
grant execute on function public.claim_daily_petals() to authenticated;

create or replace function private.play_petal_garden_impl()
returns table(balance integer,awarded integer)
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_awarded boolean; v_day date;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  v_day := (now() at time zone 'Asia/Tokyo')::date;
  v_awarded := private.post_petal_entry(v_account,v_character,3,'game','Daily Petal Garden','game:garden:'||v_account::text||':'||v_day::text,null,jsonb_build_object('tokyo_day',v_day::text));
  return query select w.balance,case when v_awarded then 3 else 0 end from public.petal_wallets w where w.account_id=v_account;
end;
$$;
revoke all on function private.play_petal_garden_impl() from public,anon;
grant execute on function private.play_petal_garden_impl() to authenticated;

create or replace function public.play_petal_garden()
returns table(balance integer,awarded integer)
language sql security invoker set search_path='' as $$ select * from private.play_petal_garden_impl(); $$;
revoke all on function public.play_petal_garden() from public,anon;
grant execute on function public.play_petal_garden() to authenticated;

create or replace function private.grant_petals_to_character_impl(p_character_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_actor uuid; v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_amount<1 or p_amount>100 then raise exception 'Teacher grants must be between 1 and 100 Petals' using errcode='22023'; end if;
  select a.active_character_id into v_actor from public.accounts a where a.id=v_account;
  if not private.account_has_capability(v_account,'economy.manage'::extensions.citext) and not exists(
    select 1 from public.characters c where c.id=v_actor and c.character_state='active' and c.character_kind='faculty' and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then raise exception 'Teacher or economy management access required' using errcode='42501'; end if;
  select c.account_id into v_target_account from public.characters c where c.id=p_character_id and c.character_state='active';
  if v_target_account is null then raise exception 'Target character is unavailable' using errcode='P0002'; end if;
  return private.post_petal_entry(v_target_account,p_character_id,p_amount,'teacher_grant',coalesce(nullif(trim(p_note),''),'Teacher Petal grant'),'teacher:'||p_request_id::text,v_actor,jsonb_build_object('request_id',p_request_id::text));
end;
$$;
revoke all on function private.grant_petals_to_character_impl(uuid,integer,text,uuid) from public,anon;
grant execute on function private.grant_petals_to_character_impl(uuid,integer,text,uuid) to authenticated;

create or replace function public.grant_petals_to_character(p_character_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean
language sql security invoker set search_path='' as $$ select private.grant_petals_to_character_impl(p_character_id,p_amount,p_note,p_request_id); $$;
revoke all on function public.grant_petals_to_character(uuid,integer,text,uuid) from public,anon;
grant execute on function public.grant_petals_to_character(uuid,integer,text,uuid) to authenticated;

create or replace function private.purchase_boutique_item_impl(p_item_id uuid,p_request_id uuid)
returns table(balance integer,item_id uuid,quantity integer)
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_item public.boutique_items%rowtype; v_existing integer; v_now timestamptz := now(); v_start timestamptz; v_end timestamptz; v_posted boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  select * into v_item from public.boutique_items where id=p_item_id and state='published';
  if not found then raise exception 'Boutique item is unavailable' using errcode='P0002'; end if;
  select i.quantity into v_existing from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id;
  if v_existing is not null and v_item.item_type<>'hanami_plus_pass' then raise exception 'Item already owned' using errcode='P0001'; end if;
  v_posted := private.post_petal_entry(v_account,v_character,-v_item.price_petals,'purchase','Purchased '||v_item.name,'purchase:'||p_request_id::text,v_character,jsonb_build_object('item_id',p_item_id::text,'item_slug',v_item.slug));
  if not v_posted then
    return query select w.balance,p_item_id,coalesce(i.quantity,0) from public.petal_wallets w left join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account;
    return;
  end if;
  insert into public.inventory_items(account_id,item_id,quantity) values(v_account,p_item_id,1)
  on conflict(account_id,item_id) do update set quantity=public.inventory_items.quantity+1,updated_at=now();
  if v_item.item_type='hanami_plus_pass' then
    select greatest(v_now,coalesce(e.ends_at,v_now)) into v_start from public.hanami_plus_entitlements e where e.account_id=v_account;
    v_start := coalesce(v_start,v_now);
    v_end := v_start + make_interval(days=>v_item.pass_days);
    insert into public.hanami_plus_entitlements(account_id,starts_at,ends_at,source_item_id) values(v_account,v_now,v_end,p_item_id)
    on conflict(account_id) do update set ends_at=v_end,source_item_id=p_item_id,updated_at=now();
  end if;
  return query select w.balance,p_item_id,i.quantity from public.petal_wallets w join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account;
end;
$$;
revoke all on function private.purchase_boutique_item_impl(uuid,uuid) from public,anon;
grant execute on function private.purchase_boutique_item_impl(uuid,uuid) to authenticated;

create or replace function public.purchase_boutique_item(p_item_id uuid,p_request_id uuid)
returns table(balance integer,item_id uuid,quantity integer)
language sql security invoker set search_path='' as $$ select * from private.purchase_boutique_item_impl(p_item_id,p_request_id); $$;
revoke all on function public.purchase_boutique_item(uuid,uuid) from public,anon;
grant execute on function public.purchase_boutique_item(uuid,uuid) to authenticated;

create or replace function private.close_roleplay_session_impl(p_session_id uuid)
returns integer
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_actor uuid; v_session public.roleplay_sessions%rowtype; v_part record; v_count integer:=0; v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_actor from public.accounts where id=v_account;
  select * into v_session from public.roleplay_sessions where id=p_session_id for update;
  if not found then raise exception 'Roleplay session not found' using errcode='P0002'; end if;
  if v_session.status='closed' then return 0; end if;
  if v_session.created_by_character_id<>v_actor and not private.account_has_capability(v_account,'economy.manage'::extensions.citext) then raise exception 'Session creator or economy manager required' using errcode='42501'; end if;
  update public.roleplay_sessions set status='closed',closed_at=now() where id=p_session_id;
  for v_part in select character_id from public.roleplay_session_participants where session_id=p_session_id loop
    select account_id into v_target_account from public.characters where id=v_part.character_id;
    if private.post_petal_entry(v_target_account,v_part.character_id,v_session.petal_reward,'roleplay_session','Roleplay session: '||v_session.title,'roleplay:'||p_session_id::text||':'||v_part.character_id::text,v_actor,jsonb_build_object('session_id',p_session_id::text)) then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.close_roleplay_session_impl(uuid) from public,anon;
grant execute on function private.close_roleplay_session_impl(uuid) to authenticated;

create or replace function public.close_roleplay_session(p_session_id uuid)
returns integer
language sql security invoker set search_path='' as $$ select private.close_roleplay_session_impl(p_session_id); $$;
revoke all on function public.close_roleplay_session(uuid) from public,anon;
grant execute on function public.close_roleplay_session(uuid) to authenticated;

create or replace function private.sync_my_achievements_impl()
returns integer
language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_character uuid; v_def record; v_progress integer; v_count integer:=0; v_inserted uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
  for v_def in select * from public.achievement_definitions where active loop
    v_progress := case v_def.criteria_type
      when 'post_count' then (select count(*)::integer from public.social_posts where author_character_id=v_character and state='published')
      when 'blog_count' then (select count(*)::integer from public.social_posts where author_character_id=v_character and post_type='blog' and state='published')
      when 'friends_count' then (select count(*)::integer from public.friendships where status='accepted' and (requester_character_id=v_character or addressee_character_id=v_character))
      when 'club_count' then (select count(*)::integer from public.campus_group_members where character_id=v_character and status='active')
      when 'assignment_count' then (select count(*)::integer from public.academic_grades where student_character_id=v_character and points_earned is not null)
      when 'attendance_count' then (select count(*)::integer from public.academic_attendance where student_character_id=v_character)
      when 'reactions_received' then (select count(*)::integer from public.social_post_reactions r join public.social_posts p on p.id=r.post_id where p.author_character_id=v_character)
      else 0 end;
    if v_progress>=v_def.threshold then
      v_inserted := null;
      insert into public.character_achievements(character_id,achievement_id,progress_value) values(v_character,v_def.id,v_progress)
      on conflict(character_id,achievement_id) do nothing returning achievement_id into v_inserted;
      if v_inserted is null then
        update public.character_achievements set progress_value=greatest(progress_value,v_progress) where character_id=v_character and achievement_id=v_def.id;
      else
        v_count:=v_count+1;
        if v_def.petal_reward>0 then perform private.post_petal_entry(v_account,v_character,v_def.petal_reward,'achievement','Achievement: '||v_def.name,'achievement:'||v_character::text||':'||v_def.code,null,jsonb_build_object('achievement_code',v_def.code)); end if;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.sync_my_achievements_impl() from public,anon;
grant execute on function private.sync_my_achievements_impl() to authenticated;

create or replace function public.sync_my_achievements()
returns integer
language sql security invoker set search_path='' as $$ select private.sync_my_achievements_impl(); $$;
revoke all on function public.sync_my_achievements() from public,anon;
grant execute on function public.sync_my_achievements() to authenticated;
