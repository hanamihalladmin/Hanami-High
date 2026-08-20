create or replace function private.archive_my_character_internal(viewer_character_id uuid,archive_note text default 'manual export')
returns uuid language plpgsql security definer set search_path=public,private,pg_temp as $$
declare c public.characters%rowtype; new_id uuid;
begin
 select * into c from public.characters where id=viewer_character_id and owner_user_id=auth.uid();
 if c.id is null then raise exception 'Character not owned by current user'; end if;
 insert into public.character_archives(character_id,owner_user_id,display_name,role,archive_reason,snapshot,archived_by)
 values(c.id,c.owner_user_id,c.display_name,c.role::text,left(coalesce(nullif(trim(archive_note),''),'manual export'),200),
   jsonb_build_object('export_version',1,'exported_at',now(),'character',to_jsonb(c),
     'profile',(select to_jsonb(p) from public.character_profiles p where p.character_id=c.id),
     'canvas',(select to_jsonb(cv) from public.character_profile_canvases cv where cv.character_id=c.id),
     'widgets',coalesce((select jsonb_agg(to_jsonb(w) order by w.z_index) from public.character_profile_widgets w where w.character_id=c.id),'[]'::jsonb),
     'school_id',(select to_jsonb(sid) from public.character_school_ids sid where sid.character_id=c.id),
     'honors',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at) from public.student_honors h where h.student_character_id=c.id),'[]'::jsonb),
     'enrollments',coalesce((select jsonb_agg(to_jsonb(sm)) from public.section_memberships sm where sm.character_id=c.id),'[]'::jsonb),
     'onboarding',coalesce((select jsonb_agg(to_jsonb(op)) from public.character_onboarding_progress op where op.character_id=c.id),'[]'::jsonb)),auth.uid()) returning id into new_id;
 return new_id;
end;$$;
revoke all on function private.archive_my_character_internal(uuid,text) from public,anon;
grant execute on function private.archive_my_character_internal(uuid,text) to authenticated;
create or replace function public.archive_my_character(viewer_character_id uuid,archive_note text default 'manual export') returns uuid language sql security invoker set search_path=public,private,pg_temp as $$ select private.archive_my_character_internal(viewer_character_id,archive_note); $$;
revoke all on function public.archive_my_character(uuid,text) from public,anon;
grant execute on function public.archive_my_character(uuid,text) to authenticated;
