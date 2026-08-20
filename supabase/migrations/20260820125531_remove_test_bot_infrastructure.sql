begin;
drop function if exists public.attach_owner_test_faculty_qa_pack(uuid, boolean);
drop function if exists private.attach_owner_test_faculty_qa_pack_internal(uuid, boolean);
drop table if exists public.test_bot_faculty_section_assignments cascade;
drop table if exists public.test_bot_faculty cascade;
commit;
