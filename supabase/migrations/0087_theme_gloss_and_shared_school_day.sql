-- Hanami+ editable site gloss + exact V1 shared school-day blocks.

alter table public.account_preferences
  add column if not exists custom_theme_gloss_mode text not null default 'soft',
  add column if not exists custom_theme_gloss_color text not null default '#ffffff',
  add column if not exists custom_theme_gloss_strength smallint not null default 55;

alter table public.account_preferences drop constraint if exists account_preferences_custom_theme_gloss_mode_check;
alter table public.account_preferences add constraint account_preferences_custom_theme_gloss_mode_check
  check (custom_theme_gloss_mode in ('none','soft','glass','metallic'));
alter table public.account_preferences drop constraint if exists account_preferences_custom_theme_gloss_color_check;
alter table public.account_preferences add constraint account_preferences_custom_theme_gloss_color_check
  check (custom_theme_gloss_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.account_preferences drop constraint if exists account_preferences_custom_theme_gloss_strength_check;
alter table public.account_preferences add constraint account_preferences_custom_theme_gloss_strength_check
  check (custom_theme_gloss_strength between 0 and 100);

alter table public.account_site_theme_presets
  add column if not exists gloss_mode text not null default 'soft',
  add column if not exists gloss_color text not null default '#ffffff',
  add column if not exists gloss_strength smallint not null default 55;

alter table public.account_site_theme_presets drop constraint if exists account_site_theme_presets_gloss_mode_check;
alter table public.account_site_theme_presets add constraint account_site_theme_presets_gloss_mode_check
  check (gloss_mode in ('none','soft','glass','metallic'));
alter table public.account_site_theme_presets drop constraint if exists account_site_theme_presets_gloss_color_check;
alter table public.account_site_theme_presets add constraint account_site_theme_presets_gloss_color_check
  check (gloss_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.account_site_theme_presets drop constraint if exists account_site_theme_presets_gloss_strength_check;
alter table public.account_site_theme_presets add constraint account_site_theme_presets_gloss_strength_check
  check (gloss_strength between 0 and 100);

create or replace function public.set_my_custom_site_theme_v3(
  p_enabled boolean,
  p_ink text default null,
  p_soft text default null,
  p_paper text default null,
  p_surface text default null,
  p_border text default null,
  p_accent text default null,
  p_text text default null,
  p_text_secondary text default null,
  p_link text default null,
  p_gloss_mode text default 'soft',
  p_gloss_color text default '#ffffff',
  p_gloss_strength integer default 55
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account uuid := auth.uid();
  v_hex constant text := '^#[0-9A-Fa-f]{6}$';
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_enabled and not private.has_active_plus_for_account(v_account) then
    raise exception 'Active Hanami+ is required for custom website themes' using errcode='42501';
  end if;
  if p_enabled and (
    p_ink !~ v_hex or p_soft !~ v_hex or p_paper !~ v_hex or p_surface !~ v_hex or p_border !~ v_hex or
    p_accent !~ v_hex or p_text !~ v_hex or p_text_secondary !~ v_hex or p_link !~ v_hex or p_gloss_color !~ v_hex
  ) then
    raise exception 'Theme colors must use six-digit hex values' using errcode='22023';
  end if;
  if p_enabled and p_gloss_mode not in ('none','soft','glass','metallic') then
    raise exception 'Unknown gloss mode' using errcode='22023';
  end if;
  if p_enabled and (p_gloss_strength < 0 or p_gloss_strength > 100) then
    raise exception 'Gloss strength must be between 0 and 100' using errcode='22023';
  end if;

  update public.account_preferences
  set custom_theme_enabled = p_enabled,
      custom_theme_ink = case when p_enabled then lower(p_ink) else custom_theme_ink end,
      custom_theme_soft = case when p_enabled then lower(p_soft) else custom_theme_soft end,
      custom_theme_paper = case when p_enabled then lower(p_paper) else custom_theme_paper end,
      custom_theme_surface = case when p_enabled then lower(p_surface) else custom_theme_surface end,
      custom_theme_border = case when p_enabled then lower(p_border) else custom_theme_border end,
      custom_theme_accent = case when p_enabled then lower(p_accent) else custom_theme_accent end,
      custom_theme_text = case when p_enabled then lower(p_text) else custom_theme_text end,
      custom_theme_text_secondary = case when p_enabled then lower(p_text_secondary) else custom_theme_text_secondary end,
      custom_theme_link = case when p_enabled then lower(p_link) else custom_theme_link end,
      custom_theme_gloss_mode = case when p_enabled then p_gloss_mode else custom_theme_gloss_mode end,
      custom_theme_gloss_color = case when p_enabled then lower(p_gloss_color) else custom_theme_gloss_color end,
      custom_theme_gloss_strength = case when p_enabled then p_gloss_strength::smallint else custom_theme_gloss_strength end,
      updated_at = now()
  where account_id = v_account;
  return found;
end $$;

revoke all on function public.set_my_custom_site_theme_v3(boolean,text,text,text,text,text,text,text,text,text,text,text,integer) from public;
grant execute on function public.set_my_custom_site_theme_v3(boolean,text,text,text,text,text,text,text,text,text,text,text,integer) to authenticated;

-- Restore the exact shared V1 school-day structure. Class periods stay in academic_meetings;
-- these rows represent school-wide blocks that every homeroom sees around those classes.
delete from public.school_schedule_blocks
where weekday between 1 and 5
  and (homeroom_label is null or lower(trim(homeroom_label)) in ('all homerooms','school wide','school-wide','all'))
  and block_type in ('homeroom','break','lunch','closing_advisory','dismissal','club','other');

insert into public.school_schedule_blocks
  (block_type,title,weekday,starts_at,ends_at,homeroom_label,notes,sort_order)
select block_type,title,weekday,starts_at,ends_at,'All Homerooms','v1_shared_school_day',sort_order
from (values
  ('other','Arrival',1::smallint,'08:30'::time,'08:35'::time,1),
  ('other','Shoe Change',1::smallint,'08:35'::time,'08:40'::time,2),
  ('homeroom','Asa-no-kai',1::smallint,'08:40'::time,'08:50'::time,3),
  ('lunch','Lunch',1::smallint,'12:40'::time,'13:25'::time,20),
  ('closing_advisory','Soji',1::smallint,'15:15'::time,'15:35'::time,40),
  ('homeroom','Kaeri-no-kai',1::smallint,'15:35'::time,'15:50'::time,41),
  ('club','Bukatsu',1::smallint,'16:00'::time,'18:30'::time,50),
  ('other','Arrival',2::smallint,'08:30'::time,'08:35'::time,1),
  ('other','Shoe Change',2::smallint,'08:35'::time,'08:40'::time,2),
  ('homeroom','Asa-no-kai',2::smallint,'08:40'::time,'08:50'::time,3),
  ('lunch','Lunch',2::smallint,'12:40'::time,'13:25'::time,20),
  ('closing_advisory','Soji',2::smallint,'15:15'::time,'15:35'::time,40),
  ('homeroom','Kaeri-no-kai',2::smallint,'15:35'::time,'15:50'::time,41),
  ('club','Bukatsu',2::smallint,'16:00'::time,'18:30'::time,50),
  ('other','Arrival',3::smallint,'08:30'::time,'08:35'::time,1),
  ('other','Shoe Change',3::smallint,'08:35'::time,'08:40'::time,2),
  ('homeroom','Asa-no-kai',3::smallint,'08:40'::time,'08:50'::time,3),
  ('lunch','Lunch',3::smallint,'12:40'::time,'13:25'::time,20),
  ('closing_advisory','Soji',3::smallint,'15:15'::time,'15:35'::time,40),
  ('homeroom','Kaeri-no-kai',3::smallint,'15:35'::time,'15:50'::time,41),
  ('club','Bukatsu',3::smallint,'16:00'::time,'18:30'::time,50),
  ('other','Arrival',4::smallint,'08:30'::time,'08:35'::time,1),
  ('other','Shoe Change',4::smallint,'08:35'::time,'08:40'::time,2),
  ('homeroom','Asa-no-kai',4::smallint,'08:40'::time,'08:50'::time,3),
  ('lunch','Lunch',4::smallint,'12:40'::time,'13:25'::time,20),
  ('closing_advisory','Soji',4::smallint,'15:15'::time,'15:35'::time,40),
  ('homeroom','Kaeri-no-kai',4::smallint,'15:35'::time,'15:50'::time,41),
  ('club','Bukatsu',4::smallint,'16:00'::time,'18:30'::time,50),
  ('other','Arrival',5::smallint,'08:30'::time,'08:35'::time,1),
  ('other','Shoe Change',5::smallint,'08:35'::time,'08:40'::time,2),
  ('homeroom','Asa-no-kai',5::smallint,'08:40'::time,'08:50'::time,3),
  ('lunch','Lunch',5::smallint,'12:40'::time,'13:25'::time,20),
  ('closing_advisory','Soji',5::smallint,'15:15'::time,'15:35'::time,40),
  ('homeroom','Kaeri-no-kai',5::smallint,'15:35'::time,'15:50'::time,41),
  ('club','Bukatsu',5::smallint,'16:00'::time,'18:30'::time,50)
) as shared(block_type,title,weekday,starts_at,ends_at,sort_order);
