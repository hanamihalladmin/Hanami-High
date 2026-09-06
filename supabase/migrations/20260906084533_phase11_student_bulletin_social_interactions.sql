create table if not exists public.student_request_board_likes (
  post_id uuid not null references public.student_request_board(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, character_id)
);

create table if not exists public.student_request_board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.student_request_board(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_request_board_likes_post_created_idx on public.student_request_board_likes(post_id, created_at);
create index if not exists student_request_board_comments_post_created_idx on public.student_request_board_comments(post_id, created_at);

alter table public.student_request_board_likes enable row level security;
alter table public.student_request_board_comments enable row level security;

drop policy if exists bulletin_likes_read on public.student_request_board_likes;
create policy bulletin_likes_read on public.student_request_board_likes
for select to authenticated
using (exists (select 1 from public.student_request_board p where p.id = post_id));

drop policy if exists bulletin_likes_add_own on public.student_request_board_likes;
create policy bulletin_likes_add_own on public.student_request_board_likes
for insert to authenticated
with check (
  public.current_user_owns_character(character_id)
  and exists (select 1 from public.student_request_board p where p.id = post_id and p.status = 'open')
);

drop policy if exists bulletin_likes_remove_own on public.student_request_board_likes;
create policy bulletin_likes_remove_own on public.student_request_board_likes
for delete to authenticated
using (public.current_user_owns_character(character_id) or public.school_staff_can_manage());

drop policy if exists bulletin_comments_read on public.student_request_board_comments;
create policy bulletin_comments_read on public.student_request_board_comments
for select to authenticated
using (exists (select 1 from public.student_request_board p where p.id = post_id));

drop policy if exists bulletin_comments_add_own on public.student_request_board_comments;
create policy bulletin_comments_add_own on public.student_request_board_comments
for insert to authenticated
with check (
  public.current_user_owns_character(character_id)
  and exists (select 1 from public.student_request_board p where p.id = post_id and p.status = 'open')
);

drop policy if exists bulletin_comments_update_own on public.student_request_board_comments;
create policy bulletin_comments_update_own on public.student_request_board_comments
for update to authenticated
using (public.current_user_owns_character(character_id) or public.school_staff_can_manage())
with check (public.current_user_owns_character(character_id) or public.school_staff_can_manage());

drop policy if exists bulletin_comments_remove_own on public.student_request_board_comments;
create policy bulletin_comments_remove_own on public.student_request_board_comments
for delete to authenticated
using (public.current_user_owns_character(character_id) or public.school_staff_can_manage());

revoke all on public.student_request_board_likes from anon;
revoke all on public.student_request_board_comments from anon;
grant select, insert, delete on public.student_request_board_likes to authenticated;
grant select, insert, update, delete on public.student_request_board_comments to authenticated;
