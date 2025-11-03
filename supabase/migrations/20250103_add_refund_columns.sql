-- Add refund columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_link_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_square_payment_id ON orders(square_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_square_order_id ON orders(square_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_refunded ON orders(refunded);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Update RLS policies to allow admin to update orders (for refund)
DROP POLICY IF EXISTS "Admin can update orders" ON orders;
CREATE POLICY "Admin can update orders"
    ON orders
    FOR UPDATE
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Comment on columns
COMMENT ON COLUMN orders.refunded IS '返金済みフラグ';
COMMENT ON COLUMN orders.refund_id IS 'Square返金ID';
COMMENT ON COLUMN orders.refund_reason IS '返金理由';
COMMENT ON COLUMN orders.refunded_at IS '返金日時';
COMMENT ON COLUMN orders.square_payment_id IS 'Square決済ID';
COMMENT ON COLUMN orders.square_order_id IS 'Square注文ID';
COMMENT ON COLUMN orders.square_payment_link_id IS 'Square決済リンクID';
COMMENT ON COLUMN orders.payment_status IS '決済ステータス (pending/paid/refunded)';
COMMENT ON COLUMN orders.paid_at IS '決済完了日時';
