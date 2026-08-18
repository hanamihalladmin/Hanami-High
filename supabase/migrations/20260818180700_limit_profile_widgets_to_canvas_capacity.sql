create or replace function private.enforce_profile_canvas_capacity()
returns trigger language plpgsql security definer set search_path=public as $$
declare canvas_area bigint; used_area bigint;
begin
  select (canvas_width::bigint*canvas_height::bigint) into canvas_area from public.character_profile_canvases where character_id=new.character_id;
  if canvas_area is null then return new; end if;
  select coalesce(sum(width::bigint*height::bigint),0) into used_area from public.character_profile_widgets where character_id=new.character_id and (tg_op='INSERT' or id<>new.id);
  if used_area + (new.width::bigint*new.height::bigint) > canvas_area then
    raise exception 'Profile canvas is full. Remove or resize existing widgets before adding another.';
  end if;
  return new;
end;$$;

drop trigger if exists enforce_profile_canvas_capacity on public.character_profile_widgets;
create trigger enforce_profile_canvas_capacity
before insert or update of width,height,character_id on public.character_profile_widgets
for each row execute function private.enforce_profile_canvas_capacity();
