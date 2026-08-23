create unique index if not exists school_memory_timeline_source_unique
on public.school_memory_timeline(source_type,source_id)
where source_id is not null;

create or replace function public.school_memory_from_character_milestone()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  rp_date date;
begin
  rp_date := coalesce(new.roleplay_date,make_date(2006,extract(month from new.created_at at time zone 'Asia/Tokyo')::int,extract(day from new.created_at at time zone 'Asia/Tokyo')::int));
  insert into public.school_memory_timeline(title,summary,category,scope,target_id,roleplay_date,source_type,source_id,visibility)
  values(new.title,new.description,coalesce(nullif(new.category,''),'school_life'),'character',new.character_id,rp_date,'character_milestone',new.id,coalesce(nullif(new.visibility,''),'public'))
  on conflict (source_type,source_id) where source_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists trg_school_memory_character_milestone on public.character_milestones;
create trigger trg_school_memory_character_milestone
after insert on public.character_milestones
for each row execute function public.school_memory_from_character_milestone();

create or replace function public.school_memory_from_sports_fixture()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  team_name text;
  rp_date date;
begin
  if new.status not in ('completed','final','finished') or new.hanami_score is null or new.opponent_score is null or new.hanami_score <= new.opponent_score then
    return new;
  end if;
  select name into team_name from public.sports_teams where id=new.team_id;
  rp_date := make_date(2006,extract(month from coalesce(new.starts_at,new.created_at) at time zone 'Asia/Tokyo')::int,extract(day from coalesce(new.starts_at,new.created_at) at time zone 'Asia/Tokyo')::int);
  insert into public.school_memory_timeline(title,summary,category,scope,target_id,roleplay_date,source_type,source_id,visibility)
  values(coalesce(team_name,'Hanami')||' victory',coalesce(team_name,'Hanami')||' defeated '||new.opponent||' '||new.hanami_score||'–'||new.opponent_score||case when nullif(trim(coalesce(new.result_note,'')),'') is not null then '. '||new.result_note else '.' end,'sports','schoolwide',new.team_id,rp_date,'sports_fixture',new.id,'public')
  on conflict (source_type,source_id) where source_id is not null do update set title=excluded.title,summary=excluded.summary,roleplay_date=excluded.roleplay_date;
  return new;
end;
$$;

drop trigger if exists trg_school_memory_sports_fixture on public.sports_fixtures;
create trigger trg_school_memory_sports_fixture
after insert or update of status,hanami_score,opponent_score,result_note on public.sports_fixtures
for each row execute function public.school_memory_from_sports_fixture();

grant execute on function public.school_memory_from_character_milestone() to authenticated;
grant execute on function public.school_memory_from_sports_fixture() to authenticated;
