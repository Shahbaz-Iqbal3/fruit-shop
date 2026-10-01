create table if not exists shop_settings(id int primary key default 1 check (id=1),name text not null default 'Fresh Fruit Shop',logo_url text,color text not null default '#be123c',whatsapp text);
insert into shop_settings(id) values(1) on conflict do nothing;
alter table shop_settings enable row level security;
create policy "read shop" on shop_settings for select using (true);
create policy "owner shop" on shop_settings for all using (is_owner()) with check (is_owner());
