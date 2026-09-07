insert into public.capabilities(code,description)
values ('system.configure'::extensions.citext,'Manage platform-level Hanami system configuration.')
on conflict(code) do update set description=excluded.description;

insert into public.platform_role_capabilities(role_id,capability_code)
select r.id,'system.configure'::extensions.citext
from public.platform_roles r
where r.code::text in ('owner','platform_admin')
on conflict(role_id,capability_code) do nothing;
