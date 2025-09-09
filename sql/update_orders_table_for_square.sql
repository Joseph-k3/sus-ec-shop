-- ordersテーブルにSquare決済用のカラムを追加
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method text,      -- 支払い方法（'square', 'bank_transfer'）
ADD COLUMN IF NOT EXISTS payment_status text,      -- 支払い状態（'pending', 'completed', 'failed'）
ADD COLUMN IF NOT EXISTS square_payment_id text,   -- Square決済ID
ADD COLUMN IF NOT EXISTS shipping_status text,     -- 配送状態（'pending', 'shipped', 'delivered'）
ADD COLUMN IF NOT EXISTS customer_name text,       -- 顧客名
ADD COLUMN IF NOT EXISTS customer_email text,      -- 顧客メールアドレス
ADD COLUMN IF NOT EXISTS customer_phone text,      -- 顧客電話番号
ADD COLUMN IF NOT EXISTS shipping_address text,    -- 配送先住所
ADD COLUMN IF NOT EXISTS notes text,              -- 備考欄
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- updated_atを自動更新するトリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 支払い方法の制約を追加
ALTER TABLE orders
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('square', 'bank_transfer'));

-- 支払い状態の制約を追加
ALTER TABLE orders
ADD CONSTRAINT check_payment_status
CHECK (payment_status IN ('pending', 'completed', 'failed'));

-- 配送状態の制約を追加
ALTER TABLE orders
ADD CONSTRAINT check_shipping_status
CHECK (shipping_status IN ('pending', 'shipped', 'delivered'));
