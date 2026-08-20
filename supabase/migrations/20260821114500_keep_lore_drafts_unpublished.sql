update public.lore_pages
set status='draft',updated_at=now()
where slug='hanami-high-history' and status='published';
