-- Square決済用のカラムを追加するマイグレーション

-- ordersテーブルにSquare関連のカラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_link_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_orders_square_order_id ON orders(square_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメントを追加
COMMENT ON COLUMN orders.square_order_id IS 'SquareのOrder ID';
COMMENT ON COLUMN orders.square_payment_id IS 'SquareのPayment ID';
COMMENT ON COLUMN orders.square_payment_link_id IS 'SquareのPayment Link ID';
COMMENT ON COLUMN orders.payment_status IS '決済ステータス: pending, paid, failed';
COMMENT ON COLUMN orders.paid_at IS '決済完了日時';
COMMENT ON COLUMN orders.zip_code IS '郵便番号';
COMMENT ON COLUMN orders.order_number IS '注文番号（カート注文の場合はグループ識別用）';
COMMENT ON COLUMN orders.customer_id IS '顧客ID（localStorage保存）';
