-- UUIDの拡張機能を有効化（まだ有効になっていない場合）
create extension if not exists "uuid-ossp";

-- ordersテーブルの作成
create table if not exists orders (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references succulents (id) not null,
    customer_name text not null,
    phone text not null,
    email text not null,
    address text not null,
    payment_method text not null,
    status text default 'pending' not null,
    created_at timestamp with time zone default now() not null
);

-- RLS（Row Level Security）ポリシーの設定
alter table orders enable row level security;

-- 誰でも注文の作成が可能
create policy "Anyone can create orders"
    on orders
    for insert
    to authenticated, anon
    with check (true);

-- 管理者のみが全ての注文を閲覧可能
create policy "Only admin can view orders"
    on orders
    for select
    to authenticated
    using (auth.role() = 'authenticated');
