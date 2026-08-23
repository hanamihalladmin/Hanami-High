create unique index if not exists portal_notifications_source_unique on public.portal_notifications(character_id,category,source_type,source_id) where source_id is not null;

create or replace function public.notify_course_assignment() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if new.status::text='published' and (tg_op='INSERT' or old.status::text is distinct from 'published') then
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  select sm.character_id,'assignment','New assignment: '||new.title,coalesce('Due '||to_char(new.due_at at time zone 'Asia/Tokyo','Mon DD, HH24:MI')||' JST','A new assignment was published.'),'normal','/portal/student/','course_assignment',new.id
  from public.section_memberships sm where sm.section_id=new.section_id and sm.relationship::text='student'
  on conflict do nothing;
 end if;return new;end $$;
drop trigger if exists trg_notify_course_assignment on public.course_assignments;
create trigger trg_notify_course_assignment after insert or update of status on public.course_assignments for each row execute function public.notify_course_assignment();

create or replace function public.notify_submission_grade() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare assignment_title text;
begin
 if new.grade is not null and new.grade is distinct from old.grade then
  select title into assignment_title from public.course_assignments where id=new.assignment_id;
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.student_character_id,'grade','Grade posted: '||coalesce(assignment_title,'Assignment'),'Your posted grade is '||new.grade::text||'.','normal','/portal/student/','assignment_submission',new.id)
  on conflict do nothing;
 end if;return new;end $$;
drop trigger if exists trg_notify_submission_grade on public.assignment_submissions;
create trigger trg_notify_submission_grade after update of grade on public.assignment_submissions for each row execute function public.notify_submission_grade();

create or replace function public.notify_friendship_change() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare requester_name text;addressee_name text;
begin
 select display_name into requester_name from public.characters where id=new.requester_character_id;
 select display_name into addressee_name from public.characters where id=new.addressee_character_id;
 if tg_op='INSERT' and new.status::text='pending' then
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.addressee_character_id,'friend_request','Friend request from '||coalesce(requester_name,'a Hanami student'),'Open Friends to respond.','normal','/portal/student/','friendship',new.id) on conflict do nothing;
 elsif tg_op='UPDATE' and new.status::text='accepted' and old.status::text is distinct from 'accepted' then
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.requester_character_id,'friend_request',coalesce(addressee_name,'Your classmate')||' accepted your friend request','You are now connected on Hanami.','normal','/portal/student/','friendship_acceptance',new.id) on conflict do nothing;
 end if;return new;end $$;
drop trigger if exists trg_notify_friendship_change on public.character_friendships;
create trigger trg_notify_friendship_change after insert or update of status on public.character_friendships for each row execute function public.notify_friendship_change();

create or replace function public.notify_organization_application() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare activity_name text;
begin
 if tg_op='UPDATE' and new.status is distinct from old.status and new.status not in ('submitted','pending') then
  select name into activity_name from public.campus_activities where id=new.activity_id;
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.student_character_id,'club_approval',coalesce(activity_name,'Activity')||' application: '||initcap(replace(new.status,'_',' ')),coalesce(nullif(new.staff_response,''),'Your activity application was updated.'),'normal','/portal/student/','organization_application',new.id) on conflict do nothing;
 end if;return new;end $$;
drop trigger if exists trg_notify_organization_application on public.organization_applications;
create trigger trg_notify_organization_application after update of status on public.organization_applications for each row execute function public.notify_organization_application();

create or replace function public.notify_election_application() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if tg_op='UPDATE' and new.status is distinct from old.status and new.status<>'pending' then
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.candidate_character_id,'election','Student Council application: '||initcap(replace(new.status,'_',' ')),coalesce(new.reviewer_note,'Your election application was updated.'),'normal','/portal/student/','election_candidate_application',new.id) on conflict do nothing;
 end if;return new;end $$;
drop trigger if exists trg_notify_election_application on public.election_candidate_applications;
create trigger trg_notify_election_application after update of status on public.election_candidate_applications for each row execute function public.notify_election_application();

create or replace function public.notify_profile_guestbook() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare author_name text;
begin
 select display_name into author_name from public.characters where id=new.author_character_id;
 insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
 values(new.profile_character_id,'guestbook','New profile '||replace(new.entry_mode,'_',' ')||' from '||coalesce(author_name,'a Hanami member'),left(new.body,160),'normal','/portal/student/','guestbook_entry',new.id) on conflict do nothing;
 return new;end $$;
drop trigger if exists trg_notify_profile_guestbook on public.profile_guestbook_entries;
create trigger trg_notify_profile_guestbook after insert on public.profile_guestbook_entries for each row execute function public.notify_profile_guestbook();

create or replace function public.notify_anonymous_question() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
 values(new.recipient_character_id,'profile_question',case when new.is_anonymous then 'New anonymous question' else 'New profile question' end,left(new.question,160),'normal','/portal/student/','anonymous_question',new.id) on conflict do nothing;
 return new;end $$;
drop trigger if exists trg_notify_anonymous_question on public.anonymous_questions;
create trigger trg_notify_anonymous_question after insert on public.anonymous_questions for each row execute function public.notify_anonymous_question();
