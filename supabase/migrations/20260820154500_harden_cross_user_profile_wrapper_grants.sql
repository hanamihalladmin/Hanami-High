begin;
revoke execute on function public.lookup_visible_character_profile(uuid,text) from anon;
revoke execute on function public.lookup_visible_profile_design(uuid,text) from anon;
revoke execute on function public.lookup_visible_profile_social(uuid,text) from anon;
grant execute on function public.lookup_visible_character_profile(uuid,text) to authenticated;
grant execute on function public.lookup_visible_profile_design(uuid,text) to authenticated;
grant execute on function public.lookup_visible_profile_social(uuid,text) to authenticated;
commit;
