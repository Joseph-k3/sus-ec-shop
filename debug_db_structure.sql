// テーブル構造確認と郵便番号カラム追加スクリプト
// Supabaseのダッシュボードで実行してください

-- 現在のordersテーブル構造を確認
\d orders;

-- または
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- zip_codeカラムが存在しない場合は追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- 既存データに仮の値を設定
UPDATE orders SET zip_code = '000-0000' WHERE zip_code IS NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_orders_zip_code ON orders(zip_code);

-- テーブル構造を再確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
