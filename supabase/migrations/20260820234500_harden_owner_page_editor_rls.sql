-- Keep public page text readable from the public site while preventing direct client writes.
-- Owner edits are written only through the SECURITY DEFINER owner_web_save_public_page_text RPC.
revoke insert, update, delete, truncate, references, trigger on table public.public_page_text_blocks from anon, authenticated;
grant select on table public.public_page_text_blocks to anon, authenticated;
