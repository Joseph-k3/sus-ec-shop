-- Supabaseダッシュボードで実行するSQL
-- 1. 現在のテーブル構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. zip_codeカラムを追加（存在しない場合）
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- 3. 既存のデータに仮の値を設定
UPDATE public.orders SET zip_code = '000-0000' WHERE zip_code IS NULL;

-- 4. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_orders_zip_code ON public.orders(zip_code);

-- 5. 最終確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;
