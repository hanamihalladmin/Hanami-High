-- Hanami High v2: members of a homeroom may see the roster for that same homeroom.
-- This supports Discord-like homeroom member lists without exposing unrelated rooms.

drop policy if exists homeroom_memberships_select_visible on public.homeroom_memberships;
create policy homeroom_memberships_select_visible
on public.homeroom_memberships
for select
to authenticated
using (
  student_character_id = (
    select a.active_character_id
    from public.accounts a
    where a.id = (select auth.uid())
  )
  or exists (
    select 1
    from public.school_homerooms h
    where h.id = homeroom_id
      and (
        public.academic_is_homeroom_member(h.code)
        or public.academic_can_manage_homeroom(h.code)
      )
  )
);

comment on policy homeroom_memberships_select_visible on public.homeroom_memberships is
  'A character may see their own membership, the roster of their current homeroom, or a roster they are authorized to manage.';
