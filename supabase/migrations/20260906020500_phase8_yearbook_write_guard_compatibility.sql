create or replace function private.enforce_yearbook_school_fields()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if private.account_has_publishing_capability(auth.uid(),'yearbook_manage') then return new; end if;
  if not public.current_user_owns_character(new.character_id) then raise exception 'Character ownership required'; end if;
  if tg_op='INSERT' then
    new.approved:=false;
    new.locked_at:=null;
  else
    if old.locked_at is not null then raise exception 'This yearbook profile is locked for archive'; end if;
    new.approved:=old.approved;
    new.locked_at:=old.locked_at;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_yearbook_school_fields on public.yearbook_profiles;
create trigger enforce_yearbook_school_fields before insert or update on public.yearbook_profiles for each row execute function private.enforce_yearbook_school_fields();

create policy "yearbook_profiles_owner_insert" on public.yearbook_profiles for insert to authenticated with check (public.current_user_owns_character(character_id));
create policy "yearbook_profiles_owner_update" on public.yearbook_profiles for update to authenticated using (public.current_user_owns_character(character_id)) with check (public.current_user_owns_character(character_id));
