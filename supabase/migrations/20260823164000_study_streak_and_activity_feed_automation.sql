create or replace function public.update_study_streak_from_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  study_day date;
  prior public.study_streaks%rowtype;
  next_streak integer;
begin
  if coalesce(new.duration_minutes,0) <= 0 then
    return new;
  end if;
  study_day := (coalesce(new.ended_at,new.started_at,new.created_at) at time zone 'Asia/Tokyo')::date;
  select * into prior from public.study_streaks where character_id=new.character_id for update;
  if not found then
    insert into public.study_streaks(character_id,current_streak,longest_streak,last_study_date,updated_at)
    values(new.character_id,1,1,study_day,now());
    return new;
  end if;
  if prior.last_study_date=study_day then
    next_streak:=greatest(prior.current_streak,1);
  elsif prior.last_study_date=study_day-1 then
    next_streak:=greatest(prior.current_streak,0)+1;
  else
    next_streak:=1;
  end if;
  update public.study_streaks
  set current_streak=next_streak,
      longest_streak=greatest(prior.longest_streak,next_streak),
      last_study_date=study_day,
      updated_at=now()
  where character_id=new.character_id;
  return new;
end;
$$;

drop trigger if exists study_sessions_update_streak on public.study_sessions;
create trigger study_sessions_update_streak
after insert or update of duration_minutes,ended_at on public.study_sessions
for each row execute function public.update_study_streak_from_session();

create or replace function public.feed_friendship_accepted()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status::text='accepted' and (tg_op='INSERT' or old.status::text is distinct from 'accepted') then
    insert into public.activity_feed_events(character_id,event_type,title,description,visibility,entity_type,entity_id)
    values
      (new.requester_character_id,'friendship','New friendship','A new Hanami friendship was formed.','friends_only','friendship',new.id),
      (new.addressee_character_id,'friendship','New friendship','A new Hanami friendship was formed.','friends_only','friendship',new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists friendship_activity_feed on public.character_friendships;
create trigger friendship_activity_feed after insert or update of status on public.character_friendships for each row execute function public.feed_friendship_accepted();

create or replace function public.feed_journal_published()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.visibility in ('public','friends_only') and (tg_op='INSERT' or old.visibility is distinct from new.visibility or old.published_at is distinct from new.published_at) then
    if not exists(select 1 from public.activity_feed_events where entity_type='journal' and entity_id=new.id) then
      insert into public.activity_feed_events(character_id,event_type,title,description,visibility,entity_type,entity_id)
      values(new.character_id,'journal','New journal entry',new.title,new.visibility,'journal',new.id);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists journal_activity_feed on public.character_journals;
create trigger journal_activity_feed after insert or update of visibility,published_at on public.character_journals for each row execute function public.feed_journal_published();

create or replace function public.feed_student_commendation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.visible_to_student then
    insert into public.activity_feed_events(character_id,event_type,title,description,visibility,entity_type,entity_id)
    values(new.student_character_id,'commendation',new.title,coalesce(new.note,new.category),'friends_only','commendation',new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists commendation_activity_feed on public.student_commendations;
create trigger commendation_activity_feed after insert on public.student_commendations for each row execute function public.feed_student_commendation();
