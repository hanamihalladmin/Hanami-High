create or replace function public.owner_create_backup_snapshot(snapshot_label text default 'Hanami school checkpoint')
returns uuid
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  snapshot_id uuid := gen_random_uuid();
  payload jsonb;
  clean_label text := left(coalesce(nullif(trim(snapshot_label),''),'Hanami school checkpoint'),160);
begin
  if not coalesce(public.current_owner_status(),false) then
    raise exception 'Owner permission required.';
  end if;
  payload := jsonb_build_object(
    'schema_version',1,'generated_at',now(),'roleplay_year',2006,
    'manifest',jsonb_build_object(
      'school_state_config',(select count(*) from public.school_state_config),
      'school_schedule_blocks',(select count(*) from public.school_schedule_blocks),
      'academic_courses',(select count(*) from public.academic_courses),
      'class_sections',(select count(*) from public.class_sections),
      'homerooms',(select count(*) from public.homerooms),
      'site_announcements',(select count(*) from public.site_announcements),
      'school_calendar_events',(select count(*) from public.school_calendar_events),
      'feature_flags',(select count(*) from public.feature_flags),
      'school_theme_schedule',(select count(*) from public.school_theme_schedule)
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
  insert into public.backup_snapshots(id,snapshot_type,label,metadata,requested_by,status,storage_path,created_at,completed_at)
  values(snapshot_id,'materialized_school_checkpoint',clean_label,payload,auth.uid(),'completed','database://backup_snapshots/'||snapshot_id::text,now(),now());
  return snapshot_id;
end;
$function$;
revoke all on function public.owner_create_backup_snapshot(text) from public,anon,authenticated;
grant execute on function public.owner_create_backup_snapshot(text) to authenticated;
