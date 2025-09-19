-- スマホでの複数商品購入問題を解決するためのマイグレーション
-- 重複注文防止ロジックを調整し、異なる商品の連続購入を許可する

-- 現在のトリガーを削除
DROP TRIGGER IF EXISTS prevent_rapid_duplicate_orders_trigger ON orders;
DROP FUNCTION IF EXISTS prevent_rapid_duplicate_orders();

-- 改善された重複注文防止関数を作成
CREATE OR REPLACE FUNCTION prevent_rapid_duplicate_orders_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. 同じ商品・同じ顧客IDで直近30秒以内の注文をチェック（時間を短縮）
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND customer_id = NEW.customer_id
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 seconds'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status NOT IN ('cancelled', 'expired')
    ) THEN
        RAISE EXCEPTION 'RAPID_DUPLICATE: 同じ商品の注文を短時間で連続して作成することはできません。30秒ほどお待ちください。';
    END IF;
    
    -- 2. 同じ顧客で直近10秒以内の大量注文をチェック（DDoS防止）
    IF (
        SELECT COUNT(*)
        FROM orders
        WHERE customer_id = NEW.customer_id
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 seconds'
        AND status NOT IN ('cancelled', 'expired')
    ) >= 3 THEN
        RAISE EXCEPTION 'TOO_MANY_ORDERS: 短時間での大量注文が検出されました。しばらくお待ちください。';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 新しいトリガーを作成
CREATE TRIGGER prevent_rapid_duplicate_orders_trigger_v2
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_rapid_duplicate_orders_v2();

-- 既存の注文データのインデックスを改善（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_orders_customer_product_time 
ON orders (customer_id, product_id, created_at DESC)
WHERE status NOT IN ('cancelled', 'expired');

CREATE INDEX IF NOT EXISTS idx_orders_customer_time 
ON orders (customer_id, created_at DESC)
WHERE status NOT IN ('cancelled', 'expired');
