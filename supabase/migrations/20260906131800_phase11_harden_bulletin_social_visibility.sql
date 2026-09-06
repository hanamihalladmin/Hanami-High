drop policy if exists bulletin_likes_read on public.student_request_board_likes;
create policy bulletin_likes_read on public.student_request_board_likes
for select to authenticated
using (
  exists (
    select 1
    from public.student_request_board p
    where p.id = post_id
      and p.visibility = 'school'
  )
);

drop policy if exists bulletin_likes_add_own on public.student_request_board_likes;
create policy bulletin_likes_add_own on public.student_request_board_likes
for insert to authenticated
with check (
  public.current_user_owns_character(character_id)
  and exists (
    select 1
    from public.characters c
    where c.id = character_id
      and c.role = 'student'
  )
  and exists (
    select 1
    from public.student_request_board p
    where p.id = post_id
      and p.status = 'open'
      and p.visibility = 'school'
  )
);

drop policy if exists bulletin_comments_read on public.student_request_board_comments;
create policy bulletin_comments_read on public.student_request_board_comments
for select to authenticated
using (
  exists (
    select 1
    from public.student_request_board p
    where p.id = post_id
      and p.visibility = 'school'
  )
);

drop policy if exists bulletin_comments_add_own on public.student_request_board_comments;
create policy bulletin_comments_add_own on public.student_request_board_comments
for insert to authenticated
with check (
  public.current_user_owns_character(character_id)
  and exists (
    select 1
    from public.characters c
    where c.id = character_id
      and c.role = 'student'
  )
  and exists (
    select 1
    from public.student_request_board p
    where p.id = post_id
      and p.status = 'open'
      and p.visibility = 'school'
  )
);

drop policy if exists bulletin_comments_update_own on public.student_request_board_comments;
create policy bulletin_comments_update_own on public.student_request_board_comments
for update to authenticated
using (
  public.current_user_owns_character(character_id)
  or public.school_staff_can_manage()
)
with check (
  public.school_staff_can_manage()
  or (
    public.current_user_owns_character(character_id)
    and exists (
      select 1
      from public.characters c
      where c.id = character_id
        and c.role = 'student'
    )
    and exists (
      select 1
      from public.student_request_board p
      where p.id = post_id
        and p.status = 'open'
        and p.visibility = 'school'
    )
  )
);
