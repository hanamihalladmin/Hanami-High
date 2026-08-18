alter table public.character_profile_widgets drop constraint if exists character_profile_widgets_height_check;
alter table public.character_profile_widgets add constraint character_profile_widgets_height_check check (height >= 4 and height <= 1800);
