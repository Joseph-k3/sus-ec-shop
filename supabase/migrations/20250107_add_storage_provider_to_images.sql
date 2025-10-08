-- 画像テーブルにストレージプロバイダー情報を追加
-- Supabase Dashboard → SQL Editor で実行

ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'succulents-images',
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_product_images_storage_provider 
ON product_images(storage_provider);

-- コメント追加
COMMENT ON COLUMN product_images.storage_provider IS 'ストレージプロバイダー（supabase, cloudflare_r2）';
COMMENT ON COLUMN product_images.storage_key IS 'ストレージ内のキー（R2用）';
COMMENT ON COLUMN product_images.storage_bucket IS 'ストレージバケット名';
COMMENT ON COLUMN product_images.original_filename IS '元のファイル名';
COMMENT ON COLUMN product_images.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN product_images.mime_type IS 'MIMEタイプ';
