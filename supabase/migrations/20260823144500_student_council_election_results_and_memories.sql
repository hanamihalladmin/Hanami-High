create table if not exists public.election_position_results (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.election_positions(id) on delete cascade,
  nomination_id uuid not null references public.election_nominations(id) on delete cascade,
  candidate_character_id uuid not null references public.characters(id) on delete cascade,
  vote_count integer not null default 0,
  rank integer not null,
  elected boolean not null default false,
  finalized_by uuid,
  finalized_at timestamptz not null default now(),
  unique(position_id,nomination_id)
);

alter table public.election_position_results enable row level security;
revoke all on public.election_position_results from anon;
grant select on public.election_position_results to authenticated;
create policy "authenticated read election results"
on public.election_position_results for select to authenticated using (true);

create or replace function public.finalize_election_position(target_position_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  allowed boolean;
  winners integer;
  election_title text;
  position_title text;
  close_time timestamptz;
  happened date;
  result_count integer;
  winner_row record;
begin
  select coalesce(public.current_owner_status(),false) or exists(
    select 1 from public.account_permissions ap where ap.user_id=auth.uid() and ap.permission::text='site_admin'
  ) into allowed;
  if not allowed then raise exception 'Site Admin or Owner permission required.'; end if;

  select greatest(1,ep.max_winners::integer),se.title,ep.title,se.voting_close_at
  into winners,election_title,position_title,close_time
  from public.election_positions ep join public.school_elections se on se.id=ep.election_id
  where ep.id=target_position_id;
  if position_title is null then raise exception 'Election position not found.'; end if;

  delete from public.election_position_results where position_id=target_position_id;

  insert into public.election_position_results(position_id,nomination_id,candidate_character_id,vote_count,rank,elected,finalized_by,finalized_at)
  select target_position_id,x.nomination_id,x.candidate_character_id,x.vote_count,x.rank,(x.rank<=winners),auth.uid(),now()
  from (
    select n.id nomination_id,n.candidate_character_id,count(b.id)::integer vote_count,
           row_number() over(order by count(b.id) desc,n.created_at asc,n.id)::integer rank
    from public.election_nominations n
    left join public.election_ballots b on b.nomination_id=n.id and b.position_id=n.position_id
    where n.position_id=target_position_id and n.status='approved'
    group by n.id,n.candidate_character_id,n.created_at
  ) x;

  happened:=make_date(2006,extract(month from coalesce(close_time,now()) at time zone 'Asia/Tokyo')::int,extract(day from coalesce(close_time,now()) at time zone 'Asia/Tokyo')::int);

  for winner_row in select * from public.election_position_results where position_id=target_position_id and elected=true loop
    if not exists(select 1 from public.memory_scrapbook_entries m where m.character_id=winner_row.candidate_character_id and m.entry_type='milestone' and m.source_entity_type='election_position' and m.source_entity_id=target_position_id) then
      insert into public.memory_scrapbook_entries(character_id,entry_type,title,description,source_entity_type,source_entity_id,happened_on,visibility)
      values(winner_row.candidate_character_id,'milestone','Elected '||position_title,'Elected to '||position_title||' in '||election_title||' with '||winner_row.vote_count||' vote'||case when winner_row.vote_count=1 then '' else 's' end||'.','election_position',target_position_id,happened,'public');
      insert into public.activity_feed_events(character_id,event_type,title,description,visibility,entity_type,entity_id)
      values(winner_row.candidate_character_id,'student_council_election','Elected '||position_title,'Won a Student Council office in '||election_title||'.','public','election_position',target_position_id);
    end if;
  end loop;

  select count(*) into result_count from public.election_position_results where position_id=target_position_id;
  return jsonb_build_object('position_id',target_position_id,'position_title',position_title,'candidate_results',result_count,'winner_slots',winners);
end;
$$;

grant execute on function public.finalize_election_position(uuid) to authenticated;
