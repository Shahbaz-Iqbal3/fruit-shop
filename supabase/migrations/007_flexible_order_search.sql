create or replace function search_orders(q text) returns setof orders language sql stable as $$
  select o.* from orders o
  where is_owner() and length(trim(q)) >= 2
  and not exists (
    select 1 from unnest(regexp_split_to_array(trim(q), '\s+')) t
    where t <> '' and not (
      o.customer_name ilike '%'||t||'%' or o.address ilike '%'||t||'%' or coalesce(o.note,'') ilike '%'||t||'%'
      or o.id::text ilike t||'%'
      or exists (select 1 from jsonb_array_elements(o.items) e where e->>'name' ilike '%'||t||'%')
      or (length(regexp_replace(t,'\D','','g')) >= 3 and regexp_replace(o.phone,'\D','','g') like '%'||regexp_replace(t,'\D','','g')||'%')
      or (length(regexp_replace(regexp_replace(t,'\D','','g'),'^(0092|92|0)','')) >= 3 and regexp_replace(o.phone,'\D','','g') like '%'||regexp_replace(regexp_replace(t,'\D','','g'),'^(0092|92|0)','')||'%')
    )
  )
  order by o.created_at desc limit 50
$$;
grant execute on function search_orders(text) to authenticated;
