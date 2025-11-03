-- Square決済の在庫管理を修正
-- 2025-01-03作成

-- 注文作成時の在庫チェックトリガー関数を修正
-- Square決済の場合は、Webhook受信時に在庫を減らすため、作成時はチェックのみ
CREATE OR REPLACE FUNCTION check_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- 在庫数を取得
  SELECT quantity INTO current_stock
  FROM succulents 
  WHERE id = NEW.product_id;
  
  -- 商品が存在しない場合
  IF current_stock IS NULL THEN
    RAISE EXCEPTION '商品が見つかりません。商品ID: %', NEW.product_id;
  END IF;
  
  -- Square決済の場合
  IF NEW.payment_method = 'square' THEN
    -- Webhook受信時に在庫を減らすため、作成時は警告のみ
    IF current_stock < NEW.quantity THEN
      RAISE NOTICE '在庫不足の可能性: 商品ID: %, 現在在庫: %, 要求数量: %', 
        NEW.product_id, current_stock, NEW.quantity;
    END IF;
    -- Square決済は続行（Webhookで処理）
    RETURN NEW;
  END IF;
  
  -- 銀行振込など、その他の決済方法の場合は在庫チェック
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION '在庫が不足しています。商品ID: %, 現在在庫: %, 要求数量: %', 
      NEW.product_id, current_stock, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの再作成
DROP TRIGGER IF EXISTS trigger_check_stock_before_order ON orders;
CREATE TRIGGER trigger_check_stock_before_order
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_before_order();

COMMENT ON FUNCTION check_stock_before_order IS '注文作成時の在庫チェック（Square決済は警告のみ、Webhookで処理）';
