-- 既存のテーブルにcustomer_idカラムを追加
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- customer_idのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "注文の作成を許可" ON orders;
DROP POLICY IF EXISTS "自分の注文のみ参照可能" ON orders;
DROP POLICY IF EXISTS "管理者は全ての注文を閲覧可能" ON orders;

-- 新しいRLSポリシーを作成
CREATE POLICY "注文の作成を許可" ON orders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "自分の注文のみ参照可能" ON orders 
    FOR SELECT USING (
        customer_id IS NULL OR -- 未認証ユーザーの注文も表示
        customer_id::text = auth.uid()::text -- 自分の注文のみ表示
    );

CREATE POLICY "管理者は全ての注文を閲覧可能" ON orders 
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- orders テーブルに関連するトリガーを作成
CREATE OR REPLACE FUNCTION set_customer_id()
RETURNS TRIGGER AS $$
BEGIN
    -- 認証されたユーザーの場合はUIDを設定
    IF auth.uid() IS NOT NULL THEN
        NEW.customer_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新規注文時に自動的にcustomer_idを設定
CREATE TRIGGER set_customer_id_on_insert
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_id();
