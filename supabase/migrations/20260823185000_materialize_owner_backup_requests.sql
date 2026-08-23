create or replace function private.materialize_backup_snapshot_request()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare payload jsonb;
begin
  if new.status <> 'requested' or new.snapshot_type not in ('school_year_checkpoint','materialized_school_checkpoint') then return new; end if;
  if not coalesce(public.current_owner_status(),false) then raise exception 'Owner permission required.'; end if;
  payload := jsonb_build_object(
    'schema_version',1,'generated_at',now(),'roleplay_year',2006,'request',coalesce(new.metadata,'{}'::jsonb),
    'manifest',jsonb_build_object(
      'school_state_config',(select count(*) from public.school_state_config),'school_schedule_blocks',(select count(*) from public.school_schedule_blocks),'academic_courses',(select count(*) from public.academic_courses),'class_sections',(select count(*) from public.class_sections),'homerooms',(select count(*) from public.homerooms),'site_announcements',(select count(*) from public.site_announcements),'school_calendar_events',(select count(*) from public.school_calendar_events),'feature_flags',(select count(*) from public.feature_flags),'school_theme_schedule',(select count(*) from public.school_theme_schedule)
    ),
    'data',jsonb_build_object(
      'school_state_config',coalesce((select jsonb_agg(to_jsonb(x)) from public.school_state_config x),'[]'::jsonb),
      'school_schedule_blocks',coalesce((select jsonb_agg(to_jsonb(x) order by x.weekday,x.starts_at) from public.school_schedule_blocks x),'[]'::jsonb),
      'academic_courses',coalesce((select jsonb_agg(to_jsonb(x) order by x.code) from public.academic_courses x),'[]'::jsonb),
      'class_sections',coalesce((select jsonb_agg(to_jsonb(x) order by x.section_code) from public.class_sections x),'[]'::jsonb),
      'homerooms',coalesce((select jsonb_agg(to_jsonb(x) order by x.code) from public.homerooms x),'[]'::jsonb),
      'site_announcements',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.site_announcements x),'[]'::jsonb),
      'school_calendar_events',coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_at) from public.school_calendar_events x),'[]'::jsonb),
      'feature_flags',coalesce((select jsonb_agg(to_jsonb(x) order by x.key) from public.feature_flags x),'[]'::jsonb),
      'school_theme_schedule',coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_on) from public.school_theme_schedule x),'[]'::jsonb)
    )
  );
  new.metadata := payload;
  new.snapshot_type := 'materialized_school_checkpoint';
  new.status := 'completed';
  new.completed_at := now();
  new.storage_path := 'database://backup_snapshots/'||new.id::text;
  return new;
end;
$function$;
drop trigger if exists materialize_backup_snapshot_request on public.backup_snapshots;
create trigger materialize_backup_snapshot_request before insert on public.backup_snapshots for each row execute function private.materialize_backup_snapshot_request();
