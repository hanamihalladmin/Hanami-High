create table if not exists public.petal_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid null references public.characters(id) on delete set null,
  source_type text not null,
  source_key text not null,
  amount integer not null check (amount between 1 and 250),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);
create index if not exists petal_reward_events_user_created_idx on public.petal_reward_events(user_id,created_at desc);
alter table public.petal_reward_events enable row level security;
revoke all on table public.petal_reward_events from anon, authenticated;
grant select on table public.petal_reward_events to authenticated;
drop policy if exists petal_reward_events_read_own on public.petal_reward_events;
create policy petal_reward_events_read_own on public.petal_reward_events for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.petal_teacher_grants (
  id uuid primary key default gen_random_uuid(), teacher_user_id uuid not null references auth.users(id) on delete cascade,
  teacher_character_id uuid not null references public.characters(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_character_id uuid not null references public.characters(id) on delete cascade,
  amount integer not null check (amount between 1 and 25), note text not null check (char_length(btrim(note)) between 1 and 280), created_at timestamptz not null default now()
);
alter table public.petal_teacher_grants enable row level security;
revoke all on table public.petal_teacher_grants from anon, authenticated;
grant select on table public.petal_teacher_grants to authenticated;
drop policy if exists petal_teacher_grants_read_related on public.petal_teacher_grants;
create policy petal_teacher_grants_read_related on public.petal_teacher_grants for select to authenticated using ((select auth.uid()) in (teacher_user_id,recipient_user_id));

create table if not exists public.petal_game_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade, started_at timestamptz not null default now(), finished_at timestamptz null,
  score integer null check (score between 0 and 100), reward integer not null default 0 check (reward between 0 and 10), created_at timestamptz not null default now()
);
create index if not exists petal_game_runs_user_started_idx on public.petal_game_runs(user_id,started_at desc);
alter table public.petal_game_runs enable row level security;
revoke all on table public.petal_game_runs from anon, authenticated;
grant select on table public.petal_game_runs to authenticated;
drop policy if exists petal_game_runs_read_own on public.petal_game_runs;
create policy petal_game_runs_read_own on public.petal_game_runs for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.credit_petal_reward(p_user_id uuid,p_character_id uuid,p_source_type text,p_source_key text,p_amount integer,p_reason text,p_metadata jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid;
begin
  if p_user_id is null or p_source_type is null or btrim(p_source_type)='' or p_source_key is null or btrim(p_source_key)='' or p_amount < 1 or p_amount > 250 then return false; end if;
  insert into public.petal_reward_events(user_id,character_id,source_type,source_key,amount,reason,metadata)
  values(p_user_id,p_character_id,btrim(p_source_type),btrim(p_source_key),p_amount,left(coalesce(nullif(btrim(p_reason),''),'Petal reward'),240),coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,source_type,source_key) do nothing returning id into v_event_id;
  if v_event_id is null then return false; end if;
  insert into public.petal_wallets(user_id,balance,lifetime_earned,updated_at) values(p_user_id,p_amount,p_amount,now())
  on conflict(user_id) do update set balance=public.petal_wallets.balance + excluded.balance,lifetime_earned=public.petal_wallets.lifetime_earned + excluded.lifetime_earned,updated_at=now();
  insert into public.petal_transactions(user_id,amount,reason,source_type,source_id) values(p_user_id,p_amount,left(coalesce(nullif(btrim(p_reason),''),'Petal reward'),240),btrim(p_source_type),v_event_id);
  return true;
end $$;
revoke execute on function private.credit_petal_reward(uuid,uuid,text,text,integer,text,jsonb) from public, anon, authenticated;

create or replace function private.reward_assignment_submission_petals() returns trigger language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
  if new.status::text <> 'submitted' then return new; end if; if tg_op='UPDATE' and old.status::text='submitted' then return new; end if;
  select c.owner_user_id into v_user from public.characters c where c.id=new.student_character_id;
  if v_user is not null then perform private.credit_petal_reward(v_user,new.student_character_id,'assignment',new.id::text,4,'Assignment submitted',jsonb_build_object('assignment_id',new.assignment_id)); end if; return new;
end $$;
revoke execute on function private.reward_assignment_submission_petals() from public, anon, authenticated;
drop trigger if exists reward_assignment_submission_petals on public.assignment_submissions;
create trigger reward_assignment_submission_petals after insert or update of status on public.assignment_submissions for each row execute function private.reward_assignment_submission_petals();

create or replace function private.reward_roleplay_participation_petals() returns trigger language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
  if new.status <> 'confirmed' then return new; end if; if tg_op='UPDATE' and old.status='confirmed' then return new; end if;
  select c.owner_user_id into v_user from public.characters c where c.id=new.character_id;
  if v_user is not null then perform private.credit_petal_reward(v_user,new.character_id,'roleplay_session',new.session_id::text,12,'Roleplay session participation',jsonb_build_object('participation_id',new.id)); end if; return new;
end $$;
revoke execute on function private.reward_roleplay_participation_petals() from public, anon, authenticated;
drop trigger if exists reward_roleplay_participation_petals on public.roleplay_session_participation;
create trigger reward_roleplay_participation_petals after insert or update of status on public.roleplay_session_participation for each row execute function private.reward_roleplay_participation_petals();

create or replace function private.reward_received_bulletin_like_petals() returns trigger language plpgsql security definer set search_path='' as $$
declare v_author_character uuid; v_author_user uuid; v_liker_user uuid;
begin
  select p.character_id,c.owner_user_id into v_author_character,v_author_user from public.student_request_board p join public.characters c on c.id=p.character_id where p.id=new.post_id and p.visibility='school';
  select c.owner_user_id into v_liker_user from public.characters c where c.id=new.character_id;
  if v_author_user is not null and v_liker_user is not null and v_author_user <> v_liker_user then perform private.credit_petal_reward(v_author_user,v_author_character,'post_like',new.post_id::text||':'||new.character_id::text,1,'Received a like on a bulletin post',jsonb_build_object('post_id',new.post_id,'liker_character_id',new.character_id)); end if; return new;
end $$;
revoke execute on function private.reward_received_bulletin_like_petals() from public, anon, authenticated;
drop trigger if exists reward_received_bulletin_like_petals on public.student_request_board_likes;
create trigger reward_received_bulletin_like_petals after insert on public.student_request_board_likes for each row execute function private.reward_received_bulletin_like_petals();

create or replace function private.claim_daily_petals_for_current_user() returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_character uuid; v_key text; v_awarded boolean;
begin
  v_user=(select auth.uid()); if v_user is null then raise exception 'Authentication required'; end if;
  select c.id into v_character from public.characters c where c.owner_user_id=v_user and c.is_active=true and c.role in ('student','faculty') order by case when c.role='student' then 0 else 1 end,c.created_at limit 1;
  if v_character is null then raise exception 'An active Hanami character is required'; end if;
  v_key=to_char(timezone('Asia/Tokyo',now()),'YYYY-MM-DD'); v_awarded=private.credit_petal_reward(v_user,v_character,'daily_login',v_key,5,'Daily Hanami login',jsonb_build_object('tokyo_date',v_key)); return case when v_awarded then 5 else 0 end;
end $$;
revoke execute on function private.claim_daily_petals_for_current_user() from public, anon; grant execute on function private.claim_daily_petals_for_current_user() to authenticated;
create or replace function public.claim_daily_petals() returns integer language sql security invoker set search_path='' as $$ select private.claim_daily_petals_for_current_user() $$;
revoke execute on function public.claim_daily_petals() from public, anon; grant execute on function public.claim_daily_petals() to authenticated;

create or replace function private.teacher_grant_petals_to_student(p_target_character_id uuid,p_amount integer,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_teacher_character uuid; v_recipient_user uuid; v_grant uuid; v_today_total integer; v_awarded boolean;
begin
  v_user=(select auth.uid()); if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount < 1 or p_amount > 25 then raise exception 'Teacher grants must be between 1 and 25 Petals'; end if;
  if char_length(btrim(coalesce(p_note,''))) < 1 or char_length(btrim(p_note)) > 280 then raise exception 'A short reason is required'; end if;
  select c.id into v_teacher_character from public.characters c where c.owner_user_id=v_user and c.role='faculty' and c.is_active=true order by c.created_at limit 1;
  if v_teacher_character is null then raise exception 'Faculty character required'; end if;
  select c.owner_user_id into v_recipient_user from public.characters c where c.id=p_target_character_id and c.role='student' and c.is_active=true;
  if v_recipient_user is null then raise exception 'Active student character not found'; end if;
  select coalesce(sum(g.amount),0)::integer into v_today_total from public.petal_teacher_grants g where g.teacher_user_id=v_user and timezone('Asia/Tokyo',g.created_at)::date=timezone('Asia/Tokyo',now())::date;
  if v_today_total + p_amount > 100 then raise exception 'Daily teacher Petal grant limit reached'; end if;
  insert into public.petal_teacher_grants(teacher_user_id,teacher_character_id,recipient_user_id,recipient_character_id,amount,note) values(v_user,v_teacher_character,v_recipient_user,p_target_character_id,p_amount,btrim(p_note)) returning id into v_grant;
  v_awarded=private.credit_petal_reward(v_recipient_user,p_target_character_id,'teacher_grant',v_grant::text,p_amount,'Teacher award: '||left(btrim(p_note),180),jsonb_build_object('grant_id',v_grant,'teacher_character_id',v_teacher_character));
  if not v_awarded then raise exception 'Grant could not be credited'; end if; return v_grant;
end $$;
revoke execute on function private.teacher_grant_petals_to_student(uuid,integer,text) from public, anon; grant execute on function private.teacher_grant_petals_to_student(uuid,integer,text) to authenticated;
create or replace function public.teacher_grant_petals(target_character_id uuid,amount integer,note text) returns uuid language sql security invoker set search_path='' as $$ select private.teacher_grant_petals_to_student(target_character_id,amount,note) $$;
revoke execute on function public.teacher_grant_petals(uuid,integer,text) from public, anon; grant execute on function public.teacher_grant_petals(uuid,integer,text) to authenticated;

create or replace function private.start_petal_game_for_current_user() returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_character uuid; v_run uuid;
begin
  v_user=(select auth.uid()); if v_user is null then raise exception 'Authentication required'; end if;
  select c.id into v_character from public.characters c where c.owner_user_id=v_user and c.role='student' and c.is_active=true order by c.created_at limit 1;
  if v_character is null then raise exception 'Active student character required'; end if;
  insert into public.petal_game_runs(user_id,character_id) values(v_user,v_character) returning id into v_run; return v_run;
end $$;
revoke execute on function private.start_petal_game_for_current_user() from public, anon; grant execute on function private.start_petal_game_for_current_user() to authenticated;
create or replace function public.start_petal_game() returns uuid language sql security invoker set search_path='' as $$ select private.start_petal_game_for_current_user() $$;
revoke execute on function public.start_petal_game() from public, anon; grant execute on function public.start_petal_game() to authenticated;

create or replace function private.finish_petal_game_for_current_user(p_run_id uuid,p_score integer) returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_run public.petal_game_runs%rowtype; v_today integer; v_reward integer; v_awarded boolean;
begin
  v_user=(select auth.uid()); if v_user is null then raise exception 'Authentication required'; end if; if p_score < 0 or p_score > 100 then raise exception 'Invalid score'; end if;
  select * into v_run from public.petal_game_runs r where r.id=p_run_id and r.user_id=v_user for update; if v_run.id is null then raise exception 'Game run not found'; end if; if v_run.finished_at is not null then return v_run.reward; end if;
  if now() < v_run.started_at + interval '20 seconds' then raise exception 'Game ended too quickly'; end if; if now() > v_run.started_at + interval '10 minutes' then raise exception 'Game run expired'; end if;
  select coalesce(sum(r.reward),0)::integer into v_today from public.petal_game_runs r where r.user_id=v_user and r.finished_at is not null and timezone('Asia/Tokyo',r.finished_at)::date=timezone('Asia/Tokyo',now())::date;
  v_reward=least(10-v_today,greatest(0,floor(p_score/10.0)::integer)); update public.petal_game_runs set finished_at=now(),score=p_score,reward=v_reward where id=p_run_id;
  if v_reward > 0 then v_awarded=private.credit_petal_reward(v_user,v_run.character_id,'petal_game',p_run_id::text,v_reward,'Petal Catch game reward',jsonb_build_object('score',p_score)); if not v_awarded then v_reward=0; end if; end if; return greatest(v_reward,0);
end $$;
revoke execute on function private.finish_petal_game_for_current_user(uuid,integer) from public, anon; grant execute on function private.finish_petal_game_for_current_user(uuid,integer) to authenticated;
create or replace function public.finish_petal_game(run_id uuid,score integer) returns integer language sql security invoker set search_path='' as $$ select private.finish_petal_game_for_current_user(run_id,score) $$;
revoke execute on function public.finish_petal_game(uuid,integer) from public, anon; grant execute on function public.finish_petal_game(uuid,integer) to authenticated;
