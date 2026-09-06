drop policy if exists "content editors create campus opportunities" on public.campus_opportunities;
create policy "opportunity publishers create campus opportunities"
on public.campus_opportunities for insert to authenticated
with check (private.account_has_publishing_capability(auth.uid(),'opportunity_publish') and created_by=auth.uid());

drop policy if exists "content editors read all campus opportunities" on public.campus_opportunities;
create policy "opportunity publishers read all campus opportunities"
on public.campus_opportunities for select to authenticated
using (private.account_has_publishing_capability(auth.uid(),'opportunity_publish'));

drop policy if exists "content editors update campus opportunities" on public.campus_opportunities;
create policy "opportunity publishers update campus opportunities"
on public.campus_opportunities for update to authenticated
using (private.account_has_publishing_capability(auth.uid(),'opportunity_publish'))
with check (private.account_has_publishing_capability(auth.uid(),'opportunity_publish'));

drop policy if exists "club_recruitment_campaigns_read" on public.club_recruitment_campaigns;
create policy "club recruitment public or publisher read"
on public.club_recruitment_campaigns for select
using (is_open=true or private.account_has_publishing_capability(auth.uid(),'club_manage'));

drop policy if exists "club_recruitment_campaigns_staff_manage" on public.club_recruitment_campaigns;
create policy "club publishers manage recruitment"
on public.club_recruitment_campaigns for all to authenticated
using (private.account_has_publishing_capability(auth.uid(),'club_manage'))
with check (private.account_has_publishing_capability(auth.uid(),'club_manage'));
