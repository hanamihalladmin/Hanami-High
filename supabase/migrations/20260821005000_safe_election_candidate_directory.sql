create or replace function public.election_candidate_directory(target_election_id uuid default null)
returns table(nomination_id uuid, position_id uuid, candidate_character_id uuid, display_name text, handle text)
language sql
security definer
set search_path=public,pg_temp
as $$
  select n.id,n.position_id,n.candidate_character_id,c.display_name,c.handle
  from public.election_nominations n
  join public.election_positions p on p.id=n.position_id
  join public.school_elections e on e.id=p.election_id
  join public.characters c on c.id=n.candidate_character_id
  where n.status='approved'
    and e.status in ('voting','closed','archived')
    and (target_election_id is null or e.id=target_election_id);
$$;
revoke all on function public.election_candidate_directory(uuid) from public;
grant execute on function public.election_candidate_directory(uuid) to authenticated;
