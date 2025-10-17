-- テストデータの挿入
insert into orders (
    product_id,
    customer_name,
    phone,
    email,
    address,
    payment_method
)
select
    (select id from succulents limit 1),
    'テスト太郎',
    '090-1234-5678',
    'test@example.com',
    '東京都千代田区1-1',
    'bank'
where exists (select 1 from succulents limit 1);

-- データの確認
select * from orders limit 1;
