-- 管理者用RLS（Row Level Security）ポリシーの例
-- このSQLは必要に応じて適用してください

-- 1. RLSを有効化（まだの場合）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. 一般ユーザー用ポリシー（自分の注文のみ閲覧可能）
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        customer_id = current_setting('app.customer_id', true)
    );

-- 3. 管理者用ポリシー（全ての注文を閲覧可能）
CREATE POLICY "Admins can view all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 4. 注文の更新権限（管理者のみ）
CREATE POLICY "Only admins can update orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 注意: このポリシーを適用する場合は、アプリケーション側でも
-- current_setting('app.customer_id') を適切に設定する必要があります
