drop policy if exists "authenticated read test bot faculty" on public.test_bot_faculty;
create policy "owner reads test bot faculty" on public.test_bot_faculty for select to authenticated using (private.is_owner_discord_user());
drop policy if exists "authenticated read bot faculty assignments" on public.test_bot_faculty_section_assignments;
create policy "owner reads bot faculty assignments" on public.test_bot_faculty_section_assignments for select to authenticated using (private.is_owner_discord_user());
