-- 重複データの確認と削除
WITH duplicates AS (
    SELECT 
        order_number,
        COUNT(*) as count,
        MAX(created_at) as latest_created_at
    FROM orders
    GROUP BY order_number
    HAVING COUNT(*) > 1
)
DELETE FROM orders a
USING duplicates d
WHERE a.order_number = d.order_number
AND a.created_at < d.latest_created_at;

-- ユニーク制約の追加
ALTER TABLE orders
ADD CONSTRAINT unique_order_per_product_customer UNIQUE (
    product_id, 
    customer_name, 
    email, 
    created_at
);

-- インデックスの追加（パフォーマンス向上のため）
CREATE INDEX idx_orders_product_customer ON orders(product_id, customer_name, email);

-- トリガーの作成（重複注文の防止）
CREATE OR REPLACE FUNCTION prevent_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 直近5分以内の同じ商品の注文をチェック
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND customer_name = NEW.customer_name
        AND email = NEW.email
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION '同じ商品の注文が既に存在します。しばらく待ってから再度お試しください。';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_duplicate_orders
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_orders();

-- 古い注文データの削除（オプション）
DELETE FROM orders 
WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 year')
AND status != 'completed';
