-- テスト用: square_payment_idを手動で設定
-- 注意: これは開発/テスト環境専用です

-- 特定の注文にダミーのsquare_payment_idを設定
UPDATE orders 
SET square_payment_id = 'TEST_' || order_number || '_PAYMENT_ID',
    square_order_id = 'TEST_' || order_number || '_ORDER_ID',
    paid_at = COALESCE(paid_at, created_at)
WHERE order_number = 'ORD1762178272595254'
  AND payment_method = 'square'
  AND status = 'paid'
  AND square_payment_id IS NULL;

-- すべてのSquare決済でsquare_payment_idが未設定の注文を一括修正
-- UPDATE orders 
-- SET square_payment_id = 'TEST_' || order_number || '_PAYMENT_ID',
--     square_order_id = 'TEST_' || order_number || '_ORDER_ID',
--     paid_at = COALESCE(paid_at, created_at)
-- WHERE payment_method = 'square'
--   AND status = 'paid'
--   AND square_payment_id IS NULL;

-- 確認用クエリ
SELECT 
  order_number,
  status,
  payment_method,
  square_payment_id,
  square_order_id,
  paid_at,
  created_at
FROM orders
WHERE order_number = 'ORD1762178272595254';
