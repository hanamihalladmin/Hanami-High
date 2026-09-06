insert into public.achievement_definitions(achievement_key,label,description,category,icon,token_reward,hidden,active)
values
 ('first_assignment_submitted','First Submission','Turn in your first Hanami assignment.','academics','✎',10,false,true),
 ('first_club_joined','Club Member','Join your first Hanami club.','clubs','♣',15,false,true),
 ('first_commendation','Recognized','Receive your first staff commendation.','roleplay','★',20,false,true),
 ('first_school_event','School Spirit','RSVP to your first Hanami school event.','events','◇',15,false,true),
 ('first_volunteer_shift','Helping Hand','Complete your first verified volunteer shift.','volunteering','♥',25,false,true),
 ('first_newspaper_article','In Print','Publish your first article in The Hanami Chronicle.','social','✦',25,false,true)
on conflict (achievement_key) do update
set label=excluded.label,
    description=excluded.description,
    category=excluded.category,
    icon=excluded.icon,
    token_reward=excluded.token_reward,
    hidden=excluded.hidden,
    active=excluded.active;

create or replace function private.award_achievement_from_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  definition_id uuid;
begin
  select a.id into definition_id
    from public.achievement_definitions a
   where a.achievement_key = new.milestone_key
     and a.active
   limit 1;

  if definition_id is null then
    return new;
  end if;

  insert into public.character_achievements(character_id,achievement_id,source_type,source_id,note)
  values (new.character_id,definition_id,'character_milestone',new.id,coalesce(new.description,''))
  on conflict (character_id,achievement_id) do nothing;

  return new;
end;
$$;

revoke all on function private.award_achievement_from_milestone() from public, anon, authenticated;

drop trigger if exists award_achievement_after_character_milestone on public.character_milestones;
create trigger award_achievement_after_character_milestone
after insert on public.character_milestones
for each row execute function private.award_achievement_from_milestone();

insert into public.character_achievements(character_id,achievement_id,source_type,source_id,note)
select m.character_id,a.id,'character_milestone',m.id,coalesce(m.description,'')
from public.character_milestones m
join public.achievement_definitions a on a.achievement_key=m.milestone_key and a.active
on conflict (character_id,achievement_id) do nothing;
