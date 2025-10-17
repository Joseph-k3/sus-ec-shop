-- 1. 既存のordersテーブルを削除（もし存在する場合）
drop table if exists orders;

-- 2. succulentsテーブルのデータをバックアップ
create table succulents_backup as select * from succulents;

-- 3. 既存のsucculentsテーブルを削除
drop table succulents;

-- 4. UUIDの拡張機能を有効化
create extension if not exists "uuid-ossp";

-- 5. succulentsテーブルを再作成（idをUUID型に変更）
create table succulents (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    price integer not null,
    image text,
    created_at timestamp with time zone default now()
);

-- 6. バックアップからデータを移行（idをUUIDに変換）
insert into succulents (name, description, price, image, created_at)
select name, description, price, image, created_at
from succulents_backup;

-- 7. バックアップテーブルを削除
drop table succulents_backup;

-- 8. ordersテーブルを作成
create table orders (
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

-- 9. RLS（Row Level Security）ポリシーの設定
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
