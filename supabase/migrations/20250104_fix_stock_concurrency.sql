-- 在庫の競合状態（Race Condition）を防ぐためのデータベース制約とトリガー
-- 2025-01-04作成

-- 1. succulentsテーブルに在庫チェック制約を追加
ALTER TABLE succulents 
ADD CONSTRAINT check_quantity_non_negative 
CHECK (quantity >= 0);

-- 2. 在庫減少を安全に行う関数を作成
CREATE OR REPLACE FUNCTION update_stock_safely(
  product_id UUID,
  quantity_to_subtract INTEGER DEFAULT 1
) RETURNS TABLE(
  success BOOLEAN,
  new_quantity INTEGER,
  message TEXT
) AS $$
DECLARE
  current_quantity INTEGER;
  updated_rows INTEGER;
BEGIN
  -- 排他ロックで在庫を取得
  SELECT quantity INTO current_quantity
  FROM succulents 
  WHERE id = product_id
  FOR UPDATE;
  
  -- 商品が存在しない場合
  IF current_quantity IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, '商品が見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 在庫不足の場合
  IF current_quantity < quantity_to_subtract THEN
    RETURN QUERY SELECT FALSE, current_quantity, '在庫が不足しています'::TEXT;
    RETURN;
  END IF;
  
  -- 在庫を減少
  UPDATE succulents 
  SET quantity = quantity - quantity_to_subtract,
      updated_at = NOW()
  WHERE id = product_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN QUERY SELECT FALSE, current_quantity, '在庫更新に失敗しました'::TEXT;
    RETURN;
  END IF;
  
  -- 成功時の新しい在庫数を返す
  SELECT quantity INTO current_quantity
  FROM succulents 
  WHERE id = product_id;
  
  RETURN QUERY SELECT TRUE, current_quantity, '在庫更新に成功しました'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. 在庫復元を安全に行う関数を作成
CREATE OR REPLACE FUNCTION restore_stock_safely(
  product_id UUID,
  quantity_to_restore INTEGER DEFAULT 1
) RETURNS TABLE(
  success BOOLEAN,
  new_quantity INTEGER,
  message TEXT
) AS $$
DECLARE
  updated_rows INTEGER;
  current_quantity INTEGER;
BEGIN
  -- 在庫を復元
  UPDATE succulents 
  SET quantity = quantity + quantity_to_restore,
      updated_at = NOW()
  WHERE id = product_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN QUERY SELECT FALSE, 0, '商品が見つかりません'::TEXT;
    RETURN;
  END IF;
  
  -- 成功時の新しい在庫数を返す
  SELECT quantity INTO current_quantity
  FROM succulents 
  WHERE id = product_id;
  
  RETURN QUERY SELECT TRUE, current_quantity, '在庫復元に成功しました'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. ordersテーブルに重複注文防止の制約を追加（既存データとの競合を避けるため条件付き）
DO $$
BEGIN
  -- 既に制約が存在するかチェック
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_customer_product_pending'
  ) THEN
    -- 同一顧客が同一商品に対して同時に複数の保留中注文を作成することを防ぐ
    ALTER TABLE orders 
    ADD CONSTRAINT unique_customer_product_pending 
    UNIQUE (customer_id, product_id, status)
    DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- 5. 注文作成時の在庫チェックトリガー関数
CREATE OR REPLACE FUNCTION check_stock_before_order()
RETURNS TRIGGER AS $$
BEGIN
  -- 在庫チェック
  IF (SELECT quantity FROM succulents WHERE id = NEW.product_id) < NEW.quantity THEN
    RAISE EXCEPTION '在庫が不足しています。商品ID: %, 要求数量: %', NEW.product_id, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. トリガーを作成（既存のものがあれば削除してから作成）
DROP TRIGGER IF EXISTS trigger_check_stock_before_order ON orders;
CREATE TRIGGER trigger_check_stock_before_order
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_before_order();

-- 7. インデックスの追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_succulents_quantity ON succulents(quantity);
CREATE INDEX IF NOT EXISTS idx_orders_customer_product_status ON orders(customer_id, product_id, status);

-- 8. 権限設定（関数を実行できるようにする）
GRANT EXECUTE ON FUNCTION update_stock_safely(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_stock_safely(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_stock_safely IS '在庫を安全に減少させる関数（競合状態を防ぐ）';
COMMENT ON FUNCTION restore_stock_safely IS '在庫を安全に復元する関数';
COMMENT ON CONSTRAINT check_quantity_non_negative ON succulents IS '在庫数は0以上でなければならない';