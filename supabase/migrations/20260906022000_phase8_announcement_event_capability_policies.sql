-- Phase 8: align direct announcement and event writes with explicit publishing capabilities.

drop policy if exists "content editors create announcements" on public.site_announcements;
create policy "announcement publishers create announcements"
on public.site_announcements for insert to authenticated
with check (
  private.account_has_publishing_capability(auth.uid(),'announcement_publish')
  and created_by=auth.uid()
);

drop policy if exists "content editors read all announcements" on public.site_announcements;
create policy "announcement publishers read all announcements"
on public.site_announcements for select to authenticated
using (private.account_has_publishing_capability(auth.uid(),'announcement_publish'));

drop policy if exists "content editors update announcements" on public.site_announcements;
create policy "announcement publishers update announcements"
on public.site_announcements for update to authenticated
using (private.account_has_publishing_capability(auth.uid(),'announcement_publish'))
with check (private.account_has_publishing_capability(auth.uid(),'announcement_publish'));

drop policy if exists "content editors create school events" on public.school_calendar_events;
create policy "event publishers create school events"
on public.school_calendar_events for insert to authenticated
with check (
  private.account_has_publishing_capability(auth.uid(),'event_publish')
  and created_by=auth.uid()
);

drop policy if exists "content editors read all school events" on public.school_calendar_events;
create policy "event publishers read all school events"
on public.school_calendar_events for select to authenticated
using (private.account_has_publishing_capability(auth.uid(),'event_publish'));

drop policy if exists "content editors update school events" on public.school_calendar_events;
create policy "event publishers update school events"
on public.school_calendar_events for update to authenticated
using (private.account_has_publishing_capability(auth.uid(),'event_publish'))
with check (private.account_has_publishing_capability(auth.uid(),'event_publish'));
