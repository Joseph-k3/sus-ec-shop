-- ordersテーブルにzip_codeカラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- 既存データ用のデフォルト値設定（必要に応じて）
UPDATE orders SET zip_code = '000-0000' WHERE zip_code IS NULL;

-- zip_codeカラムにNOT NULL制約を追加（新規注文のみ）
-- 既存データがある場合は、この行をコメントアウトしてください
-- ALTER TABLE orders ALTER COLUMN zip_code SET NOT NULL;

-- インデックスを追加（配送地域での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_orders_zip_code ON orders(zip_code);
