-- Add tracking number and shipping carrier columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.tracking_number IS '追跡番号 - 配送業者から提供される荷物の追跡番号';
COMMENT ON COLUMN orders.shipping_carrier IS '配送業者 - yamato(ヤマト運輸), sagawa(佐川急便), post(日本郵便), other(その他)';

-- Create an index for faster tracking number lookups (optional)
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
