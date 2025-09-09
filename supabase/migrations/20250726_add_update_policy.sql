-- RLSポリシーの追加（注文の更新を許可）
DROP POLICY IF EXISTS "注文の更新を許可" ON orders;

CREATE POLICY "注文の更新を許可" ON orders 
FOR UPDATE USING (
    true -- 開発中は全ての更新を許可
    -- 本番環境では以下のような制限を追加
    -- customer_id::text = auth.uid()::text OR
    -- auth.role() = 'authenticated'
);

-- payment_confirmed_by_customerとpayment_confirmed_atの更新を明示的に許可
ALTER TABLE orders 
    ALTER COLUMN payment_confirmed_by_customer SET DEFAULT false,
    ALTER COLUMN payment_confirmed_at DROP NOT NULL;
