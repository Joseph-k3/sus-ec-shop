-- 在庫の競合状態を防ぐための制約とトリガーを追加

-- 在庫が負の値にならないようにチェック制約を追加
ALTER TABLE succulents 
ADD CONSTRAINT check_quantity_non_negative 
CHECK (quantity >= 0);

-- 在庫更新時の安全性を確保するためのトリガー関数
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- 在庫が負になる場合はエラーを発生
    IF NEW.quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative. Current: %, Attempted: %', OLD.quantity, NEW.quantity
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（在庫更新前にチェック）
DROP TRIGGER IF EXISTS trigger_prevent_negative_stock ON succulents;
CREATE TRIGGER trigger_prevent_negative_stock
    BEFORE UPDATE OF quantity ON succulents
    FOR EACH ROW
    EXECUTE FUNCTION prevent_negative_stock();

-- 在庫確認用の安全な関数を作成
CREATE OR REPLACE FUNCTION safe_decrease_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    new_quantity INTEGER,
    message TEXT
) AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- 在庫を確認
    SELECT quantity INTO current_stock
    FROM succulents
    WHERE id = p_product_id
    FOR UPDATE; -- 行レベルロック
    
    -- 商品が存在しない場合
    IF current_stock IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'Product not found';
        RETURN;
    END IF;
    
    -- 在庫不足の場合
    IF current_stock < p_quantity THEN
        RETURN QUERY SELECT FALSE, current_stock, 'Insufficient stock';
        RETURN;
    END IF;
    
    -- 在庫を減らす
    new_stock := current_stock - p_quantity;
    
    UPDATE succulents
    SET quantity = new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    RETURN QUERY SELECT TRUE, new_stock, 'Success';
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON FUNCTION safe_decrease_stock IS '在庫を安全に減らすための関数（競合状態を防ぐ）';
COMMENT ON CONSTRAINT check_quantity_non_negative ON succulents IS '在庫数が負の値にならないことを保証';
