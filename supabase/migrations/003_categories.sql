create table if not exists categories(id uuid primary key default gen_random_uuid(),name text not null,sort int not null default 0,created_at timestamptz default now());
alter table items add column if not exists category_id uuid references categories(id) on delete set null;
alter table categories enable row level security;
create policy "read categories" on categories for select using (true);
create policy "owner categories" on categories for all using (is_owner()) with check (is_owner());
create index if not exists items_cat_idx on items(category_id);
create index if not exists items_created_idx on items(created_at desc);
