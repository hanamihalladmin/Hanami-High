with author as (
  select user_id
  from public.account_permissions
  where permission = 'site_admin'
  order by created_at asc
  limit 1
)
insert into public.lore_pages (slug,title,category,summary,body,status,created_by,updated_at)
select
  'hanami-high-history',
  'History of Hanami High',
  'school_history',
  'Founded in 1836, Hanami High survived the Meiji era, financial collapse, gang influence, wartime upheaval, postwar occupation, and successive generations of the Kawasaki family before Principal Akira took over in 2006.',
  $lore$
Hanami began in 1836 as an ordinary local school and slowly grew in reputation and influence. During the Meiji Restoration of 1868, the school improved greatly and became well known throughout the area. That rise eventually came crashing down as local debt grew too high. Gangs moved into the area and saw Hanami as prime ground for recruiting new members.

In 1885, Sakura Kawasaki arrived as headmistress. The eldest daughter of a yakuza boss, Sakura understood the mindset, pride, and codes that influenced the young people around her. She used that understanding against the gangs and delinquent culture that had taken root around the school, imposing discipline with an iron will and restoring order to Hanami.

The school later endured the fear surrounding Pearl Harbor, the war years, and the Western occupation of Japan. Leadership eventually passed to Sakura's daughter, Nora Kawasaki, who formally took over in 1952. Nora continued the strict leadership style of her mother while improving the appearance, organization, and reputation of the school. During her tenure, Hanami received recognition from national education authorities and later earned the Medal for Education and Culture before Nora retired.

In 2006, Akira became principal of Hanami High. He is the first male head of the school since before Sakura Kawasaki's tenure began in 1885. Akira now inherits nearly two centuries of institutional history: a school shaped by survival, discipline, reinvention, and the legacy of the Kawasaki family.
$lore$,
  'published',
  author.user_id,
  now()
from author
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  body = excluded.body,
  status = excluded.status,
  updated_at = now();