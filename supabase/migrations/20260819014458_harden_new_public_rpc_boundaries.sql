do $$
declare d text;
begin
  select pg_get_functiondef('public.current_homeroom(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.current_homeroom\(','CREATE OR REPLACE FUNCTION private.current_homeroom_internal(');
  select pg_get_functiondef('public.current_homeroom_roster(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.current_homeroom_roster\(','CREATE OR REPLACE FUNCTION private.current_homeroom_roster_internal(');
  select pg_get_functiondef('public.current_homeroom_feed(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.current_homeroom_feed\(','CREATE OR REPLACE FUNCTION private.current_homeroom_feed_internal(');
  select pg_get_functiondef('public.student_todo_feed(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.student_todo_feed\(','CREATE OR REPLACE FUNCTION private.student_todo_feed_internal(');
  select pg_get_functiondef('public.current_waitlist(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.current_waitlist\(','CREATE OR REPLACE FUNCTION private.current_waitlist_internal(');
  select pg_get_functiondef('public.election_results(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.election_results\(','CREATE OR REPLACE FUNCTION private.election_results_internal(');
  select pg_get_functiondef('public.room_directory_feed()'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.room_directory_feed\(','CREATE OR REPLACE FUNCTION private.room_directory_feed_internal(');
  select pg_get_functiondef('public.school_statistics_dashboard()'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.school_statistics_dashboard\(','CREATE OR REPLACE FUNCTION private.school_statistics_dashboard_internal(');
  select pg_get_functiondef('public.sports_team_roster_directory(uuid)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.sports_team_roster_directory\(','CREATE OR REPLACE FUNCTION private.sports_team_roster_directory_internal(');
  select pg_get_functiondef('public.sports_team_standings()'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.sports_team_standings\(','CREATE OR REPLACE FUNCTION private.sports_team_standings_internal(');
  select pg_get_functiondef('public.report_client_bug(text,text,text,text,text,text,jsonb)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.report_client_bug\(','CREATE OR REPLACE FUNCTION private.report_client_bug_internal(');
  select pg_get_functiondef('public.owner_bug_detector_feed()'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.owner_bug_detector_feed\(','CREATE OR REPLACE FUNCTION private.owner_bug_detector_feed_internal(');
  select pg_get_functiondef('public.owner_update_bug_report(uuid,text,text)'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.owner_update_bug_report\(','CREATE OR REPLACE FUNCTION private.owner_update_bug_report_internal(');
  select pg_get_functiondef('public.owner_capture_bug_support_tickets()'::regprocedure) into d;
  execute regexp_replace(d,'^CREATE OR REPLACE FUNCTION public\.owner_capture_bug_support_tickets\(','CREATE OR REPLACE FUNCTION private.owner_capture_bug_support_tickets_internal(');
end $$;

create or replace function public.current_homeroom(target_character_id uuid)
returns table(homeroom_id uuid,code text,grade_level smallint,school_year text,room_label text,description text,adviser_name text,adviser_handle text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.current_homeroom_internal(target_character_id); $$;

create or replace function public.current_homeroom_roster(target_character_id uuid)
returns table(character_id uuid,display_name text,handle text,is_representative boolean,representative_title text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.current_homeroom_roster_internal(target_character_id); $$;

create or replace function public.current_homeroom_feed(target_character_id uuid)
returns table(item_type text,item_id uuid,title text,body text,starts_at timestamptz,published_at timestamptz,location text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.current_homeroom_feed_internal(target_character_id); $$;

create or replace function public.student_todo_feed(target_character_id uuid)
returns table(item_type text,title text,due_at timestamptz,priority text,source_id text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.student_todo_feed_internal(target_character_id); $$;

create or replace function public.current_waitlist(target_character_id uuid)
returns table(entry_id uuid,section_id uuid,section_code text,course_title text,waitlist_position bigint,entry_status text,created_at timestamptz)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.current_waitlist_internal(target_character_id); $$;

create or replace function public.election_results(target_election_id uuid)
returns table(position_title text,candidate_name text,candidate_handle text,votes bigint)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.election_results_internal(target_election_id); $$;

create or replace function public.room_directory_feed()
returns table(room_id uuid,room_number text,building text,floor_label text,purpose text,department text,availability_status text,current_class text,current_section_code text,class_starts time,class_ends time,notes text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.room_directory_feed_internal(); $$;

create or replace function public.school_statistics_dashboard()
returns table(student_characters bigint,faculty_characters bigint,active_characters bigint,course_enrollments bigint,organization_memberships bigint,open_reports bigint,open_office_requests bigint,open_support_tickets bigint,storage_bytes bigint)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.school_statistics_dashboard_internal(); $$;

create or replace function public.sports_team_roster_directory(target_team_id uuid)
returns table(character_id uuid,display_name text,handle text,player_position text,jersey_number text,roster_status text)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.sports_team_roster_directory_internal(target_team_id); $$;

create or replace function public.sports_team_standings()
returns table(team_id uuid,team_name text,sport text,games_played bigint,wins bigint,losses bigint,ties bigint)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.sports_team_standings_internal(); $$;

create or replace function public.report_client_bug(
  bug_fingerprint text,
  bug_title text,
  bug_details text default '',
  bug_route text default null,
  bug_area text default 'website',
  bug_severity text default 'medium',
  bug_metadata jsonb default '{}'::jsonb
) returns uuid
language sql security invoker set search_path=public,private,auth as $$
  select private.report_client_bug_internal(bug_fingerprint,bug_title,bug_details,bug_route,bug_area,bug_severity,bug_metadata);
$$;

create or replace function public.owner_bug_detector_feed()
returns table(id uuid,source text,severity text,title text,details text,affected_area text,route text,status text,owner_notes text,occurrences integer,first_seen_at timestamptz,last_seen_at timestamptz,resolved_at timestamptz,metadata jsonb)
language sql stable security invoker set search_path=public,private,auth as $$ select * from private.owner_bug_detector_feed_internal(); $$;

create or replace function public.owner_update_bug_report(target_bug_id uuid,new_status text,new_notes text default null)
returns void language sql security invoker set search_path=public,private,auth as $$ select private.owner_update_bug_report_internal(target_bug_id,new_status,new_notes); $$;

create or replace function public.owner_capture_bug_support_tickets()
returns integer language sql security invoker set search_path=public,private,auth as $$ select private.owner_capture_bug_support_tickets_internal(); $$;

revoke all on function private.current_homeroom_internal(uuid),private.current_homeroom_roster_internal(uuid),private.current_homeroom_feed_internal(uuid),private.student_todo_feed_internal(uuid),private.current_waitlist_internal(uuid),private.election_results_internal(uuid),private.room_directory_feed_internal(),private.school_statistics_dashboard_internal(),private.sports_team_roster_directory_internal(uuid),private.sports_team_standings_internal(),private.report_client_bug_internal(text,text,text,text,text,text,jsonb),private.owner_bug_detector_feed_internal(),private.owner_update_bug_report_internal(uuid,text,text),private.owner_capture_bug_support_tickets_internal() from public,anon;
grant execute on function private.current_homeroom_internal(uuid),private.current_homeroom_roster_internal(uuid),private.current_homeroom_feed_internal(uuid),private.student_todo_feed_internal(uuid),private.current_waitlist_internal(uuid),private.election_results_internal(uuid),private.room_directory_feed_internal(),private.school_statistics_dashboard_internal(),private.sports_team_roster_directory_internal(uuid),private.sports_team_standings_internal(),private.report_client_bug_internal(text,text,text,text,text,text,jsonb),private.owner_bug_detector_feed_internal(),private.owner_update_bug_report_internal(uuid,text,text),private.owner_capture_bug_support_tickets_internal() to authenticated;

revoke all on function public.current_homeroom(uuid),public.current_homeroom_roster(uuid),public.current_homeroom_feed(uuid),public.student_todo_feed(uuid),public.current_waitlist(uuid),public.election_results(uuid),public.room_directory_feed(),public.school_statistics_dashboard(),public.sports_team_roster_directory(uuid),public.sports_team_standings(),public.report_client_bug(text,text,text,text,text,text,jsonb),public.owner_bug_detector_feed(),public.owner_update_bug_report(uuid,text,text),public.owner_capture_bug_support_tickets() from public,anon;
grant execute on function public.current_homeroom(uuid),public.current_homeroom_roster(uuid),public.current_homeroom_feed(uuid),public.student_todo_feed(uuid),public.current_waitlist(uuid),public.election_results(uuid),public.room_directory_feed(),public.school_statistics_dashboard(),public.sports_team_roster_directory(uuid),public.sports_team_standings(),public.report_client_bug(text,text,text,text,text,text,jsonb),public.owner_bug_detector_feed(),public.owner_update_bug_report(uuid,text,text),public.owner_capture_bug_support_tickets() to authenticated;

drop policy if exists "owner bug reports deny direct access" on public.owner_bug_reports;
create policy "owner bug reports deny direct access" on public.owner_bug_reports for all to authenticated using (false) with check (false);
