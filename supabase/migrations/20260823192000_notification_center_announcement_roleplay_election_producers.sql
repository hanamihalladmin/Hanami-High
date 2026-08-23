create or replace function public.notify_published_announcement()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  recipient uuid;
  prio text;
begin
  if new.status::text<>'published' or new.published_at is null or new.published_at>now() then return new; end if;
  prio := case new.severity when 'emergency' then 'urgent' when 'urgent' then 'urgent' when 'warning' then 'high' else 'normal' end;
  for recipient in
    select c.id from public.characters c
    where case new.audience_scope
      when 'schoolwide' then true
      when 'student' then c.role::text='student'
      when 'faculty' then c.role::text='faculty'
      when 'character' then c.id=new.target_character_id
      when 'class' then exists(select 1 from public.section_memberships sm where sm.section_id=new.target_section_id and sm.character_id=c.id)
      else false end
  loop
    insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
    values(recipient,case when new.audience_scope='faculty' then 'staff_notice' else 'announcement' end,new.title,new.body,prio,'home.notices','site_announcement',new.id)
    on conflict (character_id,category,source_type,source_id) where source_id is not null
    do update set title=excluded.title,body=excluded.body,priority=excluded.priority;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_published_announcement on public.site_announcements;
create trigger trg_notify_published_announcement
after insert or update of status,published_at,title,body,severity,audience_scope,target_character_id,target_section_id on public.site_announcements
for each row execute function public.notify_published_announcement();

create or replace function public.notify_roleplay_participation_status()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare session_title text;
begin
  if tg_op='INSERT' and new.status='checked_in' then return new; end if;
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  if new.status not in ('confirmed','excused','declined') then return new; end if;
  select title into session_title from public.roleplay_sessions where id=new.session_id;
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.character_id,'roleplay',case new.status when 'confirmed' then 'RP participation confirmed' when 'excused' then 'RP absence excused' else 'RP participation declined' end,coalesce(session_title,'Roleplay session')||case when nullif(trim(coalesce(new.staff_note,'')),'') is not null then ' • '||new.staff_note else '' end,case when new.status='declined' then 'high' else 'normal' end,'school.life','roleplay_participation',new.id)
  on conflict (character_id,category,source_type,source_id) where source_id is not null
  do update set title=excluded.title,body=excluded.body,priority=excluded.priority,read_at=null,created_at=now();
  return new;
end;
$$;

drop trigger if exists trg_notify_roleplay_participation_status on public.roleplay_session_participation;
create trigger trg_notify_roleplay_participation_status
after insert or update of status,staff_note on public.roleplay_session_participation
for each row execute function public.notify_roleplay_participation_status();

create or replace function public.notify_election_position_result()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare office_title text;
begin
  select title into office_title from public.election_positions where id=new.position_id;
  insert into public.portal_notifications(character_id,category,title,body,priority,action_path,source_type,source_id)
  values(new.candidate_character_id,'election',case when new.elected then 'You were elected '||coalesce(office_title,'to Student Council') else 'Student Council result posted' end,case when new.elected then 'Final result: elected with '||new.vote_count||' vote'||case when new.vote_count=1 then '' else 's' end||'.' else 'Final rank: #'||new.rank||' with '||new.vote_count||' vote'||case when new.vote_count=1 then '' else 's' end||'.' end,case when new.elected then 'high' else 'normal' end,'community.campus','election_result',new.id)
  on conflict (character_id,category,source_type,source_id) where source_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists trg_notify_election_position_result on public.election_position_results;
create trigger trg_notify_election_position_result
after insert on public.election_position_results
for each row execute function public.notify_election_position_result();
