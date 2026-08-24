-- Keep Hanami High's shared school-day structure identical across Homerooms A, B, and C.
-- These blocks are school-wide and must not be replaced by class periods in a single homeroom.

with shared_blocks(title, block_type, starts_at, ends_at, sort_order) as (
  values
    ('Arrival'::text, 'other'::public.schedule_block_type, '08:30'::time, '08:35'::time, 1),
    ('Shoe Change'::text, 'other'::public.schedule_block_type, '08:35'::time, '08:40'::time, 2),
    ('Asa-no-kai'::text, 'homeroom'::public.schedule_block_type, '08:40'::time, '08:50'::time, 3),
    ('Lunch'::text, 'lunch'::public.schedule_block_type, '12:40'::time, '13:25'::time, 20),
    ('Soji'::text, 'closing_advisory'::public.schedule_block_type, '15:15'::time, '15:35'::time, 40),
    ('Kaeri-no-kai'::text, 'homeroom'::public.schedule_block_type, '15:35'::time, '15:50'::time, 41),
    ('Bukatsu'::text, 'club'::public.schedule_block_type, '16:00'::time, '18:30'::time, 50)
), homeroom_days as (
  select 'Homeroom ' || h.code as homeroom_label, d.weekday
  from public.homerooms h
  cross join (values (1::smallint),(2::smallint),(3::smallint),(4::smallint),(5::smallint)) d(weekday)
  where h.is_active = true and upper(h.code) in ('A','B','C')
)
delete from public.school_schedule_blocks b
using shared_blocks s, homeroom_days hd
where b.notes = 'owner_homeroom_daily_schedule'
  and b.homeroom_label = hd.homeroom_label
  and b.weekday = hd.weekday
  and b.starts_at < s.ends_at
  and b.ends_at > s.starts_at;

insert into public.school_schedule_blocks
  (block_type, title, weekday, starts_at, ends_at, homeroom_label, notes, sort_order)
select
  s.block_type,
  s.title,
  hd.weekday,
  s.starts_at,
  s.ends_at,
  hd.homeroom_label,
  'owner_homeroom_daily_schedule',
  s.sort_order
from (
  values
    ('Arrival'::text, 'other'::public.schedule_block_type, '08:30'::time, '08:35'::time, 1),
    ('Shoe Change'::text, 'other'::public.schedule_block_type, '08:35'::time, '08:40'::time, 2),
    ('Asa-no-kai'::text, 'homeroom'::public.schedule_block_type, '08:40'::time, '08:50'::time, 3),
    ('Lunch'::text, 'lunch'::public.schedule_block_type, '12:40'::time, '13:25'::time, 20),
    ('Soji'::text, 'closing_advisory'::public.schedule_block_type, '15:15'::time, '15:35'::time, 40),
    ('Kaeri-no-kai'::text, 'homeroom'::public.schedule_block_type, '15:35'::time, '15:50'::time, 41),
    ('Bukatsu'::text, 'club'::public.schedule_block_type, '16:00'::time, '18:30'::time, 50)
) s(title, block_type, starts_at, ends_at, sort_order)
cross join (
  select 'Homeroom ' || h.code as homeroom_label, d.weekday
  from public.homerooms h
  cross join (values (1::smallint),(2::smallint),(3::smallint),(4::smallint),(5::smallint)) d(weekday)
  where h.is_active = true and upper(h.code) in ('A','B','C')
) hd;
