create or replace function public.owner_set_homeroom_daily_schedule(
  requested_homeroom_code text,
  requested_weekday smallint,
  requested_periods jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  clean_code text := upper(trim(requested_homeroom_code));
  entry jsonb;
  period_no integer;
  assignment text;
  start_time time;
  end_time time;
  target_section uuid;
  changed_count integer := 0;
begin
  if not public.current_owner_status() then
    raise exception 'Owner access required';
  end if;
  if requested_weekday not between 1 and 5 then
    raise exception 'Weekday must be Monday through Friday';
  end if;
  if jsonb_typeof(requested_periods) <> 'array' then
    raise exception 'Periods must be a JSON array';
  end if;
  if not exists (
    select 1 from public.homerooms h
    where upper(h.code)=clean_code and h.is_active=true
  ) then
    raise exception 'Homeroom not found';
  end if;

  delete from public.section_meetings sm
  using public.class_sections cs
  where sm.section_id=cs.id
    and upper(cs.section_code)=clean_code
    and sm.weekday=requested_weekday
    and coalesce(sm.label,'') ~* '^Period [1-6]$';

  delete from public.school_schedule_blocks
  where weekday=requested_weekday
    and lower(trim(coalesce(homeroom_label,'')))=lower('Homeroom '||clean_code)
    and notes='owner_homeroom_daily_schedule';

  for entry in select value from jsonb_array_elements(requested_periods)
  loop
    period_no := nullif(entry->>'period','')::integer;
    assignment := upper(trim(coalesce(entry->>'assignment','OPEN')));
    if period_no not between 1 and 6 then
      raise exception 'Invalid period number';
    end if;
    start_time := case period_no
      when 1 then '08:50'::time when 2 then '09:50'::time when 3 then '10:50'::time
      when 4 then '11:50'::time when 5 then '13:25'::time when 6 then '14:25'::time end;
    end_time := case period_no
      when 1 then '09:40'::time when 2 then '10:40'::time when 3 then '11:40'::time
      when 4 then '12:40'::time when 5 then '14:15'::time when 6 then '15:15'::time end;

    if assignment in ('','OPEN','__OPEN__') then
      continue;
    elsif assignment in ('STUDY','__STUDY__') then
      insert into public.school_schedule_blocks(block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
      values ('study','Study Period',requested_weekday,start_time,end_time,'Homeroom '||clean_code,'owner_homeroom_daily_schedule',30+period_no);
      changed_count := changed_count+1;
    elsif assignment in ('EXTRACURRICULAR','__EXTRACURRICULAR__') then
      insert into public.school_schedule_blocks(block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
      values ('extracurricular','Extracurriculars Period',requested_weekday,start_time,end_time,'Homeroom '||clean_code,'owner_homeroom_daily_schedule',30+period_no);
      changed_count := changed_count+1;
    else
      select cs.id into target_section
      from public.class_sections cs
      join public.academic_courses ac on ac.id=cs.course_id
      where upper(cs.section_code)=clean_code and upper(ac.code)=assignment
      order by cs.created_at asc
      limit 1;
      if target_section is null then
        raise exception 'No % section exists for Homeroom %', assignment, clean_code;
      end if;
      insert into public.section_meetings(section_id,weekday,starts_at,ends_at,label)
      values (target_section,requested_weekday,start_time,end_time,'Period '||period_no);
      changed_count := changed_count+1;
    end if;
  end loop;

  return changed_count;
end;
$$;

revoke all on function public.owner_set_homeroom_daily_schedule(text,smallint,jsonb) from public;
grant execute on function public.owner_set_homeroom_daily_schedule(text,smallint,jsonb) to authenticated;
