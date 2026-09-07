alter table public.academic_assignments alter column created_by_character_id drop not null;
alter table public.academic_assignments drop constraint academic_assignments_created_by_character_id_fkey;
alter table public.academic_assignments add constraint academic_assignments_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.campus_events drop constraint campus_events_created_by_character_id_fkey;
alter table public.campus_events add constraint campus_events_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.campus_groups drop constraint campus_groups_created_by_character_id_fkey;
alter table public.campus_groups add constraint campus_groups_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.campus_opportunities drop constraint campus_opportunities_created_by_character_id_fkey;
alter table public.campus_opportunities add constraint campus_opportunities_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.roleplay_sessions alter column created_by_character_id drop not null;
alter table public.roleplay_sessions drop constraint roleplay_sessions_created_by_character_id_fkey;
alter table public.roleplay_sessions add constraint roleplay_sessions_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.school_announcements drop constraint school_announcements_created_by_character_id_fkey;
alter table public.school_announcements add constraint school_announcements_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;

drop policy if exists profile_media_delete_own on storage.objects;
create policy profile_media_delete_own on storage.objects for delete to authenticated using (
  bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text
);

create or replace function private.delete_my_character_impl(p_character_id uuid,p_confirmation text)
returns smallint language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_slot smallint;
  v_name text;
  v_state text;
  v_role text;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_confirmation <> 'DELETE' then raise exception 'Permanent deletion confirmation is required' using errcode='22023'; end if;
  select c.slot_no,coalesce(c.display_name,nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),'Hanami Character'),c.character_state,c.school_role
    into v_slot,v_name,v_state,v_role from public.characters c
    where c.id=p_character_id and c.account_id=v_account for update;
  if not found then raise exception 'Character not found or not owned by this account' using errcode='P0002'; end if;
  insert into private.audit_events(actor_account_id,actor_character_id,action,target_type,target_id,metadata)
    values(v_account,null,'character.self_delete','character',p_character_id::text,jsonb_build_object('slot_no',v_slot,'name',v_name,'state',v_state,'school_role',v_role));
  delete from public.characters where id=p_character_id and account_id=v_account;
  return v_slot;
end;
$$;
revoke all on function private.delete_my_character_impl(uuid,text) from public,anon;
grant execute on function private.delete_my_character_impl(uuid,text) to authenticated;

create or replace function public.delete_my_character(p_character_id uuid,p_confirmation text)
returns smallint language sql security invoker set search_path='' as $$
  select private.delete_my_character_impl(p_character_id,p_confirmation);
$$;
revoke all on function public.delete_my_character(uuid,text) from public,anon;
grant execute on function public.delete_my_character(uuid,text) to authenticated;
