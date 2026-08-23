create or replace function public.profile_question_box_status(target_character_id uuid)
returns table(enabled boolean,allow_anonymous boolean,moderation_mode text)
language sql stable security definer set search_path=public
as $$
  select coalesce(s.enabled,true),coalesce(s.allow_anonymous,true),coalesce(s.moderation_mode,'review')
  from (select 1) seed left join public.anonymous_question_settings s on s.character_id=target_character_id
  where exists(select 1 from public.characters c where c.id=target_character_id and c.is_active=true);
$$;
revoke all on function public.profile_question_box_status(uuid) from public;grant execute on function public.profile_question_box_status(uuid) to authenticated;
create or replace function public.submit_profile_question(target_character_id uuid,sender_character_id uuid,question_text text,anonymous_requested boolean default true)
returns uuid language plpgsql security definer set search_path=public
as $$
declare settings record;new_id uuid;begin
 if not public.current_user_owns_character(sender_character_id) then raise exception 'sender character is not owned by current user'; end if;
 if sender_character_id=target_character_id then raise exception 'cannot send a profile question to the same character'; end if;
 if length(trim(coalesce(question_text,'')))<2 or length(trim(question_text))>500 then raise exception 'question must be 2 to 500 characters'; end if;
 select * into settings from public.profile_question_box_status(target_character_id);
 if not found or not settings.enabled then raise exception 'question box is disabled'; end if;
 if anonymous_requested and not settings.allow_anonymous then raise exception 'anonymous questions are disabled'; end if;
 insert into public.anonymous_questions(recipient_character_id,sender_character_id,question,is_anonymous,status)
 values(target_character_id,sender_character_id,trim(question_text),anonymous_requested,'pending') returning id into new_id;
 return new_id;
end;$$;
revoke all on function public.submit_profile_question(uuid,uuid,text,boolean) from public;grant execute on function public.submit_profile_question(uuid,uuid,text,boolean) to authenticated;
