revoke all on table public.character_profile_widgets from anon;
revoke all on table public.character_profile_canvases from anon;
revoke truncate, references, trigger on table public.character_profile_widgets from authenticated;
revoke truncate, references, trigger on table public.character_profile_canvases from authenticated;
grant select, insert, update, delete on table public.character_profile_widgets to authenticated;
grant select, insert, update, delete on table public.character_profile_canvases to authenticated;
