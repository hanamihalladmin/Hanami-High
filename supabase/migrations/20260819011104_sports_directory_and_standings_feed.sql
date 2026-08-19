create or replace function public.sports_team_roster_directory(target_team_id uuid)
returns table(character_id uuid,display_name text,handle text,player_position text,jersey_number text,roster_status text)
language sql stable security definer set search_path=public,private,auth as $$
  select c.id,c.display_name,c.handle,r.position,r.jersey_number,r.roster_status
  from public.sports_team_roster r join public.characters c on c.id=r.student_character_id
  where r.team_id=target_team_id order by c.display_name;
$$;
revoke all on function public.sports_team_roster_directory(uuid) from public,anon;
grant execute on function public.sports_team_roster_directory(uuid) to authenticated;

create or replace function public.sports_team_standings()
returns table(team_id uuid,team_name text,sport text,games_played bigint,wins bigint,losses bigint,ties bigint)
language sql stable security definer set search_path=public,private,auth as $$
  select t.id,t.name,t.sport,
    count(f.id) filter(where f.status='completed'),
    count(f.id) filter(where f.status='completed' and f.hanami_score>f.opponent_score),
    count(f.id) filter(where f.status='completed' and f.hanami_score<f.opponent_score),
    count(f.id) filter(where f.status='completed' and f.hanami_score=f.opponent_score)
  from public.sports_teams t left join public.sports_fixtures f on f.team_id=t.id
  where t.is_active group by t.id,t.name,t.sport order by t.sport,t.name;
$$;
revoke all on function public.sports_team_standings() from public,anon;
grant execute on function public.sports_team_standings() to authenticated;
