-- cancelled_atカラムの追加
ALTER TABLE orders
ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;

-- 既存の注文データのインデックス作成
CREATE INDEX idx_orders_cancelled_at ON orders(cancelled_at);
