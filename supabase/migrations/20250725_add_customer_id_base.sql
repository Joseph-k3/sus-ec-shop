-- ordersテーブルに購入者IDカラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

COMMENT ON COLUMN orders.customer_id IS '購入者を特定するためのユニークID';
