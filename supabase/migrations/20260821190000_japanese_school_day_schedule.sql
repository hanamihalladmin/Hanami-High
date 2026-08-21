-- Align Hanami High's weekday timetable with the approved Japanese high-school day.
-- Periods are 50 minutes, with 10-minute passing time between class periods.

update public.section_meetings
set starts_at = case label
  when 'Period 1' then '08:50'::time
  when 'Period 2' then '09:50'::time
  when 'Period 3' then '10:50'::time
  when 'Period 4' then '11:50'::time
  when 'Period 5' then '13:25'::time
  when 'Period 6' then '14:25'::time
  else starts_at
end,
ends_at = case label
  when 'Period 1' then '09:40'::time
  when 'Period 2' then '10:40'::time
  when 'Period 3' then '11:40'::time
  when 'Period 4' then '12:40'::time
  when 'Period 5' then '14:15'::time
  when 'Period 6' then '15:15'::time
  else ends_at
end
where label in ('Period 1','Period 2','Period 3','Period 4','Period 5','Period 6');

-- Replace the old school-wide day blocks while leaving homeroom-specific
-- study/extracurricular blocks and other custom schedule entries intact.
delete from public.school_schedule_blocks
where weekday between 1 and 5
  and (homeroom_label is null or lower(trim(homeroom_label)) in ('all homerooms','school wide','school-wide','all'))
  and block_type in ('homeroom','break','lunch','closing_advisory','dismissal','club','other');

insert into public.school_schedule_blocks
  (block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
select
  block_type,
  title,
  weekday,
  starts_at,
  ends_at,
  'All Homerooms',
  notes,
  sort_order
from (values
  ('other','Arrival & Shoe Change','08:30'::time,'08:40'::time,'Students arrive and change into indoor school shoes at their lockers.',10),
  ('homeroom','Morning Homeroom (Asa-no-kai)','08:40'::time,'08:50'::time,'Roll call, announcements, and preparation for the school day.',20),
  ('lunch','Lunch','12:40'::time,'13:25'::time,'Lunch period; students may eat bento with classmates.',70),
  ('other','Classroom Cleaning (Soji)','15:15'::time,'15:35'::time,'Students clean their classroom and assigned school areas.',100),
  ('closing_advisory','Afternoon Homeroom (Kaeri-no-kai)','15:35'::time,'15:50'::time,'Closing announcements, reminders, and dismissal preparation.',110),
  ('club','After-School Club Activities (Bukatsu)','16:00'::time,'18:30'::time,'Official after-school club activity window.',120)
) as b(block_type,title,starts_at,ends_at,notes,sort_order)
cross join generate_series(1,5) as d(weekday);
