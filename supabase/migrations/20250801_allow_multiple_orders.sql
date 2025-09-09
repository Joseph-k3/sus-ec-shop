-- 重複注文制限を解除して複数注文を許可（ただし短時間の重複は防止）

-- 既存のEXCLUDE制約を削除
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_active_order;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS check_duplicate_orders ON orders;
DROP TRIGGER IF EXISTS prevent_rapid_duplicate_orders_trigger ON orders;
DROP TRIGGER IF EXISTS auto_cancel_expired_orders_trigger ON orders;
DROP TRIGGER IF EXISTS check_payment_due_date ON orders;

-- 重複チェックトリガー関数も削除
DROP FUNCTION IF EXISTS prevent_duplicate_orders();
DROP FUNCTION IF EXISTS prevent_rapid_duplicate_orders();
DROP FUNCTION IF EXISTS auto_cancel_expired_orders();
DROP FUNCTION IF EXISTS cancel_expired_orders();

-- 新しいトリガー関数（短時間の重複防止 + 期限切れチェック）
CREATE OR REPLACE FUNCTION prevent_rapid_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 同じ商品・メール・顧客名で直近1分以内の注文をチェック
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND email = NEW.email
        AND customer_name = NEW.customer_name
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION '同じ商品の注文を短時間で連続して作成することはできません。しばらく待ってから再度お試しください。';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 短時間重複防止トリガーを作成
CREATE TRIGGER prevent_rapid_duplicate_orders_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_rapid_duplicate_orders();

-- 新しいトリガー関数（重複チェックなし、期限切れチェックのみ）
CREATE OR REPLACE FUNCTION auto_cancel_expired_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 支払い期限が過ぎた場合の自動キャンセル（UPDATEトリガー用）
    IF TG_OP = 'UPDATE' AND 
       NEW.status = 'pending_payment' AND 
       NEW.payment_due_date < CURRENT_TIMESTAMP AND 
       NOT NEW.payment_confirmed_by_customer AND
       OLD.status = 'pending_payment' THEN
        
        -- 在庫を復元
        UPDATE succulents 
        SET quantity = quantity + NEW.quantity
        WHERE id = NEW.product_id;
        
        -- 注文をキャンセル
        NEW.status := 'cancelled';
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
            NEW.cancelled_at := CURRENT_TIMESTAMP;
        END IF;
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 期限切れ自動キャンセル用のトリガーを作成
CREATE TRIGGER auto_cancel_expired_orders_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_cancel_expired_orders();

-- 確認クエリ：現在の制約とトリガーを確認
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND constraint_type IN ('UNIQUE', 'EXCLUDE');

SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'orders';
