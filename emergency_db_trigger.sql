-- 緊急適用：DBトリガーによる重複防止
-- Supabase SQL Editorで以下を順番に実行してください

-- === STEP 1: 既存トリガーのクリーンアップ ===
DROP TRIGGER IF EXISTS prevent_rapid_duplicate_orders_trigger ON orders CASCADE;
DROP FUNCTION IF EXISTS prevent_rapid_duplicate_orders() CASCADE;

-- === STEP 2: 新しい重複防止トリガー ===
CREATE OR REPLACE FUNCTION prevent_rapid_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 同じ商品・メール・顧客名で直近30秒以内の注文をチェック
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND email = NEW.email
        AND customer_name = NEW.customer_name
        AND status != 'cancelled'
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 seconds'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'RAPID_DUPLICATE: 同じ商品の注文が30秒以内に連続して作成されています。意図しない重複決済を防ぐため、30秒後に再度お試しください。';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === STEP 3: トリガー作成 ===
CREATE TRIGGER prevent_rapid_duplicate_orders_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_rapid_duplicate_orders();

-- === STEP 4: 確認 ===
SELECT 
    trigger_name,
    'Status: Active' as status
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
AND trigger_name = 'prevent_rapid_duplicate_orders_trigger';

-- === 実行後の確認メッセージ ===
-- トリガーが正常に作成されれば、上記クエリで結果が表示されます
-- これで30秒以内の重複注文はDBレベルでブロックされます
