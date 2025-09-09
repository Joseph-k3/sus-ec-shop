-- 重複注文問題の修正

-- 既存のテストデータを削除
DELETE FROM orders WHERE order_number = 'TEST001' OR customer_name = 'テストユーザー';

-- トリガー関数を修正（より厳密な条件にする）
CREATE OR REPLACE FUNCTION prevent_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- デバッグログ
    RAISE NOTICE 'トリガー実行: product_id=%, email=%, status=%', NEW.product_id, NEW.email, NEW.status;
    
    -- 同じ商品・メールアドレスの有効な注文が存在するかチェック
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND email = NEW.email
        AND status = 'pending_payment'
        AND cancelled_at IS NULL
        AND payment_due_date > CURRENT_TIMESTAMP  -- 支払期限が未来
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE NOTICE '重複注文検出: product_id=%, email=%', NEW.product_id, NEW.email;
        RAISE EXCEPTION '同じ商品の注文が既に存在します。注文履歴をご確認ください。';
    END IF;
    
    RAISE NOTICE 'トリガー通過: 重複なし';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- EXCLUDE制約を削除して再作成（より厳密な条件に）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_active_order;

-- 新しいEXCLUDE制約を追加
ALTER TABLE orders
ADD CONSTRAINT unique_active_order EXCLUDE USING btree (
    product_id WITH =,
    email WITH =
) WHERE (
    status = 'pending_payment' AND
    cancelled_at IS NULL AND
    payment_due_date > CURRENT_TIMESTAMP  -- 支払期限が未来
);

-- インデックスの最適化
DROP INDEX IF EXISTS idx_orders_duplicate_check;
CREATE INDEX idx_orders_duplicate_check ON orders(product_id, email, status, cancelled_at, payment_due_date)
WHERE status = 'pending_payment' AND cancelled_at IS NULL;

-- 既存の期限切れ注文をクリーンアップ
UPDATE orders 
SET status = 'cancelled', 
    cancelled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'pending_payment' 
AND payment_due_date < CURRENT_TIMESTAMP 
AND cancelled_at IS NULL;

-- 在庫復元（期限切れ注文分）
WITH expired_orders AS (
    SELECT product_id, SUM(quantity) as total_quantity
    FROM orders
    WHERE status = 'cancelled' 
    AND cancelled_at = CURRENT_TIMESTAMP  -- 今回キャンセルした注文のみ
    GROUP BY product_id
)
UPDATE succulents 
SET quantity = quantity + eo.total_quantity
FROM expired_orders eo
WHERE succulents.id = eo.product_id;

COMMIT;
