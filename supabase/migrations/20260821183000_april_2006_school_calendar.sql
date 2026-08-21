-- Hanami High opening-month calendar for the 2006-07 roleplay school year.
-- Times are stored with the Asia/Tokyo (+09:00) school timezone.

insert into public.school_calendar_events
  (title, description, location, starts_at, ends_at, all_day, category, status, featured, registration_open, registration_capacity)
select v.title, v.description, v.location, v.starts_at, v.ends_at, v.all_day,
       v.category::school_event_category, 'published'::school_event_status,
       v.featured, v.registration_open, v.registration_capacity
from (values
  ('First-Year Entrance Ceremony',
   'Formal welcome ceremony for Hanami High first-year students and the opening of their first school year.',
   'Hanami High Gymnasium',
   '2006-04-08 10:00:00+09'::timestamptz, '2006-04-08 12:00:00+09'::timestamptz,
   false, 'campus', true, false, null::integer),

  ('Club & Extracurricular Fair Week',
   'Students may explore school clubs, extracurricular groups, and athletic programs throughout the week. Club registration is open during the fair. Each student may hold membership in one club and one sport.',
   'Hanami High Campus',
   '2006-04-10 00:00:00+09'::timestamptz, '2006-04-14 23:59:59+09'::timestamptz,
   true, 'campus', true, true, null::integer),

  ('Club Registration Deadline',
   'Final day to submit club and extracurricular registration after Club Fair Week. Students are limited to one club and one sport.',
   'Student Activities Office',
   '2006-04-14 16:30:00+09'::timestamptz, '2006-04-14 17:00:00+09'::timestamptz,
   false, 'deadline', false, true, null::integer),

  ('Health & Fitness Examination Week',
   'Annual student health checks take place in scheduled rotations, including medical examinations, height and weight measurements, vision and hearing screening, dental checks, and physical fitness testing.',
   'Health Office, Gymnasium & Athletic Field',
   '2006-04-17 00:00:00+09'::timestamptz, '2006-04-21 23:59:59+09'::timestamptz,
   true, 'academic', true, false, null::integer),

  ('General Medical Examinations',
   'Student medical examinations and basic health measurements begin by homeroom rotation.',
   'Health Office',
   '2006-04-17 09:00:00+09'::timestamptz, '2006-04-18 15:00:00+09'::timestamptz,
   false, 'academic', false, false, null::integer),

  ('Vision, Hearing & Dental Screenings',
   'Students complete vision, hearing, and dental screenings by assigned homeroom rotation.',
   'Health Office',
   '2006-04-19 09:00:00+09'::timestamptz, '2006-04-19 15:00:00+09'::timestamptz,
   false, 'academic', false, false, null::integer),

  ('Physical Fitness Tests',
   'School-wide fitness testing, including running, flexibility, strength, and other physical assessment stations.',
   'Gymnasium & Athletic Field',
   '2006-04-20 09:00:00+09'::timestamptz, '2006-04-21 15:00:00+09'::timestamptz,
   false, 'academic', true, false, null::integer),

  ('Greenery Day (みどりの日)',
   'Japanese national holiday as observed in 2006. No regular school activities are scheduled.',
   'Japan',
   '2006-04-29 00:00:00+09'::timestamptz, '2006-04-29 23:59:59+09'::timestamptz,
   true, 'holiday', true, false, null::integer),

  ('Golden Week School Break',
   'Hanami High is closed for Golden Week. The break includes Constitution Memorial Day, Citizen''s Holiday, and Children''s Day.',
   'Hanami High School',
   '2006-05-01 00:00:00+09'::timestamptz, '2006-05-05 23:59:59+09'::timestamptz,
   true, 'holiday', true, false, null::integer),

  ('Constitution Memorial Day (憲法記念日)',
   'Japanese national holiday during Golden Week.',
   'Japan',
   '2006-05-03 00:00:00+09'::timestamptz, '2006-05-03 23:59:59+09'::timestamptz,
   true, 'holiday', false, false, null::integer),

  ('Citizen''s Holiday (国民の休日)',
   'Japanese national holiday observed on May 4 in 2006 between Constitution Memorial Day and Children''s Day.',
   'Japan',
   '2006-05-04 00:00:00+09'::timestamptz, '2006-05-04 23:59:59+09'::timestamptz,
   true, 'holiday', false, false, null::integer),

  ('Children''s Day (こどもの日)',
   'Japanese national holiday during Golden Week.',
   'Japan',
   '2006-05-05 00:00:00+09'::timestamptz, '2006-05-05 23:59:59+09'::timestamptz,
   true, 'holiday', false, false, null::integer)
) as v(title, description, location, starts_at, ends_at, all_day, category, featured, registration_open, registration_capacity)
where not exists (
  select 1
  from public.school_calendar_events existing
  where existing.title = v.title and existing.starts_at = v.starts_at
);
