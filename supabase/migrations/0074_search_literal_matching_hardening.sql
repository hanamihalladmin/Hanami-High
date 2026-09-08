begin;

create or replace function public.search_hanami(p_query text, p_limit integer default 12)
returns table(
  id uuid,
  document_type text,
  entity_id uuid,
  title text,
  subtitle text,
  section text,
  subsection text,
  rank real
)
language sql
stable
set search_path to 'public','pg_temp'
as $$
  with input as (
    select trim(coalesce(p_query,'')) as raw_query,
           lower(trim(coalesce(p_query,''))) as normalized_query
  ), parsed as (
    select i.*,
           case when length(i.raw_query)>0 then websearch_to_tsquery('simple',i.raw_query) end as ts_query
    from input i
  ), ranked as (
    select
      d.id,
      d.document_type,
      d.entity_id,
      d.title,
      d.subtitle,
      d.section,
      d.subsection,
      greatest(
        case
          when lower(d.title)=p.normalized_query then 6.0
          when lower(coalesce(d.subtitle,''))=p.normalized_query then 5.0
          when left(lower(d.title),length(p.normalized_query))=p.normalized_query then 4.5
          when left(lower(coalesce(d.subtitle,'')),length(p.normalized_query))=p.normalized_query then 4.0
          when strpos(lower(d.title),p.normalized_query)>0 then 3.5
          when strpos(lower(coalesce(d.subtitle,'')),p.normalized_query)>0 then 3.0
          when strpos(lower(coalesce(d.body,'')),p.normalized_query)>0 then 2.5
          else 0.0
        end,
        case when p.ts_query is not null and d.search_vector @@ p.ts_query
             then 1.0 + ts_rank_cd(d.search_vector,p.ts_query)
             else 0.0 end
      )::real as rank
    from public.search_documents d
    cross join parsed p
    where length(p.raw_query)>0
      and (
        (p.ts_query is not null and d.search_vector @@ p.ts_query)
        or strpos(lower(d.title),p.normalized_query)>0
        or strpos(lower(coalesce(d.subtitle,'')),p.normalized_query)>0
        or strpos(lower(coalesce(d.body,'')),p.normalized_query)>0
      )
  )
  select r.id,r.document_type,r.entity_id,r.title,r.subtitle,r.section,r.subsection,r.rank
  from ranked r
  order by r.rank desc,r.title asc
  limit greatest(1,least(coalesce(p_limit,12),30));
$$;

grant execute on function public.search_hanami(text,integer) to authenticated;

commit;
