-- ordersテーブルにcustomer_idカラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 入金確認要求のステータスを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_by_customer BOOLEAN DEFAULT false;
COMMENT ON COLUMN orders.payment_confirmed_by_customer IS '購入者からの入金確認ボタン押下有無';

-- 入金確認要求の日時を記録
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN orders.payment_confirmed_at IS '購入者からの入金確認日時';

-- トリガー関数：入金確認時に在庫を更新
CREATE OR REPLACE FUNCTION update_stock_on_payment_confirm()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_confirmed_by_customer = true AND OLD.payment_confirmed_by_customer = false THEN
        -- 在庫を更新
        UPDATE succulents
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
        -- 入金確認日時を設定
        NEW.payment_confirmed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS trigger_payment_confirm ON orders;
CREATE TRIGGER trigger_payment_confirm
BEFORE UPDATE OF payment_confirmed_by_customer ON orders
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_payment_confirm();
