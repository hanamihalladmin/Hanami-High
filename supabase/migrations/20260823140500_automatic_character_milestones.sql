create unique index if not exists character_milestones_key_unique on public.character_milestones(character_id,milestone_key);

create or replace function public.add_character_milestone_once(target_character_id uuid,target_key text,target_title text,target_description text,target_category text,target_source_type text,target_source_id uuid,target_roleplay_date date default null)
returns void language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 insert into public.character_milestones(character_id,milestone_key,title,description,category,source_type,source_id,roleplay_date,visibility)
 values(target_character_id,target_key,target_title,coalesce(target_description,''),coalesce(target_category,'school_life'),target_source_type,target_source_id,target_roleplay_date,'public')
 on conflict (character_id,milestone_key) do nothing;
end $$;

create or replace function public.milestone_activity_joined() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare activity_name text;activity_kind text;
begin
 select name,kind::text into activity_name,activity_kind from public.campus_activities where id=new.activity_id;
 if activity_kind='club' then perform public.add_character_milestone_once(new.character_id,'first_club_joined','First club joined','Joined '||coalesce(activity_name,'a Hanami club')||'.','clubs','campus_activity',new.activity_id,current_date); end if;
 return new;end $$;
drop trigger if exists trg_milestone_activity_joined on public.campus_activity_memberships;
create trigger trg_milestone_activity_joined after insert on public.campus_activity_memberships for each row execute function public.milestone_activity_joined();

create or replace function public.milestone_assignment_submitted() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare assignment_title text;
begin
 if new.status::text='submitted' and (tg_op='INSERT' or old.status::text is distinct from 'submitted') then
  select title into assignment_title from public.course_assignments where id=new.assignment_id;
  perform public.add_character_milestone_once(new.student_character_id,'first_assignment_submitted','First assignment submitted','Submitted '||coalesce(assignment_title,'an assignment')||'.','academics','assignment_submission',new.id,current_date);
 end if;return new;end $$;
drop trigger if exists trg_milestone_assignment_submitted on public.assignment_submissions;
create trigger trg_milestone_assignment_submitted after insert or update of status on public.assignment_submissions for each row execute function public.milestone_assignment_submitted();

create or replace function public.milestone_newspaper_published() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
  perform public.add_character_milestone_once(new.author_character_id,'first_newspaper_article','First newspaper article','Published “'||new.headline||'” in The Hanami Chronicle.','journalism','newspaper_article',new.id,coalesce((new.published_at at time zone 'Asia/Tokyo')::date,current_date));
 end if;return new;end $$;
drop trigger if exists trg_milestone_newspaper_published on public.newspaper_articles;
create trigger trg_milestone_newspaper_published after insert or update of status on public.newspaper_articles for each row execute function public.milestone_newspaper_published();

create or replace function public.milestone_first_commendation() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 perform public.add_character_milestone_once(new.student_character_id,'first_commendation','First staff commendation',coalesce(new.title,'Recognized by Hanami staff')||case when coalesce(new.note,'')<>'' then ' · '||new.note else '' end,'school_life','student_commendation',new.id,(new.issued_at at time zone 'Asia/Tokyo')::date);
 return new;end $$;
drop trigger if exists trg_milestone_first_commendation on public.student_commendations;
create trigger trg_milestone_first_commendation after insert on public.student_commendations for each row execute function public.milestone_first_commendation();

create or replace function public.milestone_first_volunteer_shift() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if new.status='verified' then perform public.add_character_milestone_once(new.character_id,'first_volunteer_shift','First volunteer shift',coalesce(new.organization_name,'Hanami service')||' · '||coalesce(new.hours,0)::text||' hour(s).','volunteering','volunteer_hour_entry',new.id,new.work_date); end if;
 return new;end $$;
drop trigger if exists trg_milestone_first_volunteer_shift on public.volunteer_hour_entries;
create trigger trg_milestone_first_volunteer_shift after insert or update of status on public.volunteer_hour_entries for each row execute function public.milestone_first_volunteer_shift();

create or replace function public.milestone_first_school_event() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare event_title text; event_date date;
begin
 if new.response='going' then
  select title,(starts_at at time zone 'Asia/Tokyo')::date into event_title,event_date from public.school_calendar_events where id=new.event_id;
  perform public.add_character_milestone_once(new.character_id,'first_school_event','First school event','RSVP’d to '||coalesce(event_title,'a Hanami event')||'.','events','school_calendar_event',new.event_id,event_date);
 end if;return new;end $$;
drop trigger if exists trg_milestone_first_school_event on public.event_rsvps;
create trigger trg_milestone_first_school_event after insert or update of response on public.event_rsvps for each row execute function public.milestone_first_school_event();
