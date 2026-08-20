begin;
drop policy if exists "public read active campus activities" on public.campus_activities;
create policy "public read active campus activities"
on public.campus_activities
for select
to anon
using (is_active = true);
commit;
