create table if not exists items(id uuid primary key default gen_random_uuid(),name text not null,name_ur text,description text,price numeric not null,unit text default 'kg',image_url text,tag text default 'fresh' check (tag in ('fresh','one_day_old','on_sale')),sale_price numeric,available boolean default true,created_at timestamptz default now());
create table if not exists orders(id uuid primary key default gen_random_uuid(),customer_name text,phone text,address text,note text,items jsonb not null,total numeric not null,status text default 'placed' check (status in ('placed','accepted','preparing','out_for_delivery','delivered','cancelled')),created_at timestamptz default now());
create table if not exists owners(user_id uuid primary key);
alter table items enable row level security;alter table orders enable row level security;alter table owners enable row level security;
create or replace function is_owner() returns boolean language sql security definer stable as $$ select exists(select 1 from owners where user_id=auth.uid()) $$;
create policy "read items" on items for select using (true);
create policy "owner items" on items for all using (is_owner()) with check (is_owner());
create policy "owner orders" on orders for all using (is_owner()) with check (is_owner());
create or replace function place_order(p_name text,p_phone text,p_address text,p_note text,p_items jsonb,p_total numeric) returns uuid language sql security definer as $$ insert into orders(customer_name,phone,address,note,items,total) values(p_name,p_phone,p_address,p_note,p_items,p_total) returning id $$;
create or replace function get_order(p_id uuid) returns table(status text,total numeric,items jsonb,created_at timestamptz) language sql security definer as $$ select status,total,items,created_at from orders where id=p_id $$;
grant execute on function place_order(text,text,text,text,jsonb,numeric),get_order(uuid) to anon,authenticated;
insert into storage.buckets(id,name,public) values('items','items',true) on conflict do nothing;
create policy "public read" on storage.objects for select using (bucket_id='items');
create policy "owner write" on storage.objects for all using (bucket_id='items' and is_owner()) with check (bucket_id='items' and is_owner());
alter publication supabase_realtime add table orders;
create table if not exists shop_settings(id int primary key default 1 check (id=1),name text not null default 'Fresh Fruit Shop',logo_url text,color text not null default '#be123c',whatsapp text);
insert into shop_settings(id) values(1) on conflict do nothing;
alter table shop_settings enable row level security;
create policy "read shop" on shop_settings for select using (true);
create policy "owner shop" on shop_settings for all using (is_owner()) with check (is_owner());
create or replace function orders_by_phone(p_phone text) returns table(id uuid,status text,total numeric,items jsonb,created_at timestamptz) language sql security definer as $$ select o.id,o.status,o.total,o.items,o.created_at from orders o where length(regexp_replace(p_phone,'\D','','g'))>=10 and right(regexp_replace(o.phone,'\D','','g'),10)=right(regexp_replace(p_phone,'\D','','g'),10) order by o.created_at desc limit 20 $$;
grant execute on function orders_by_phone(text) to anon,authenticated;
create table if not exists categories(id uuid primary key default gen_random_uuid(),name text not null,sort int not null default 0,created_at timestamptz default now());
alter table items add column if not exists category_id uuid references categories(id) on delete set null;
alter table categories enable row level security;
create policy "read categories" on categories for select using (true);
create policy "owner categories" on categories for all using (is_owner()) with check (is_owner());
create index if not exists items_cat_idx on items(category_id);
create index if not exists items_created_idx on items(created_at desc);
create extension if not exists pg_net;
create table if not exists app_config(key text primary key, value text);
alter table app_config enable row level security;
alter table orders add column if not exists notified_at timestamptz;
create table if not exists push_subs(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), endpoint text unique not null, p256dh text not null, auth text not null, label text, enabled boolean not null default true, show_details boolean not null default true, created_at timestamptz default now(), last_seen timestamptz default now());
alter table push_subs enable row level security;
create policy "own devices" on push_subs for all using (is_owner() and user_id = auth.uid()) with check (is_owner() and user_id = auth.uid());
create or replace function notify_new_order() returns trigger language plpgsql security definer as $$ declare u text; begin select value into u from app_config where key = 'notify_url'; if u is not null then perform net.http_post(url := u, headers := '{"Content-Type":"application/json"}'::jsonb, body := jsonb_build_object('order_id', new.id)); end if; return new; end $$;
drop trigger if exists on_order_notify on orders;
create trigger on_order_notify after insert on orders for each row execute function notify_new_order();
alter table items add column if not exists stock_status text not null default 'in_stock' check (stock_status in ('in_stock','sold_out','back_tomorrow'));
create or replace function search_orders(q text) returns setof orders language sql stable as $$ select o.* from orders o where is_owner() and length(trim(q)) >= 3 and (o.customer_name ilike '%'||trim(q)||'%' or o.address ilike '%'||trim(q)||'%' or (length(regexp_replace(q,'\D','','g')) >= 3 and regexp_replace(o.phone,'\D','','g') like '%'||regexp_replace(q,'\D','','g')||'%')) order by o.created_at desc limit 50 $$;
grant execute on function search_orders(text) to authenticated;
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
