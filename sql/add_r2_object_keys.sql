-- R2オブジェクトキーを保存するカラムを追加
-- これにより、削除時に確実なキーでR2からファイルを削除できる

-- product_videos テーブルにR2キーカラムを追加
ALTER TABLE product_videos 
ADD COLUMN IF NOT EXISTS r2_video_key TEXT,
ADD COLUMN IF NOT EXISTS r2_thumbnail_key TEXT,
ADD COLUMN IF NOT EXISTS r2_deletion_failed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS r2_deletion_retry_count INTEGER DEFAULT 0;

-- 既存データのR2キーを抽出してセット（URLから抽出）
UPDATE product_videos
SET r2_video_key = CASE
  WHEN video_url LIKE '%r2.dev/%' THEN 
    SUBSTRING(video_url FROM POSITION('r2.dev/' IN video_url) + 7)
  ELSE NULL
END
WHERE r2_video_key IS NULL AND video_url IS NOT NULL;

UPDATE product_videos
SET r2_thumbnail_key = CASE
  WHEN thumbnail_url LIKE '%r2.dev/%' THEN 
    SUBSTRING(thumbnail_url FROM POSITION('r2.dev/' IN thumbnail_url) + 7)
  ELSE NULL
END
WHERE r2_thumbnail_key IS NULL AND thumbnail_url IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN product_videos.r2_video_key IS 'R2ストレージの動画オブジェクトキー（例: products/2025/11/videos/xxx.mov）';
COMMENT ON COLUMN product_videos.r2_thumbnail_key IS 'R2ストレージのサムネイルオブジェクトキー';
COMMENT ON COLUMN product_videos.r2_deletion_failed IS 'R2削除失敗フラグ（リトライ用）';
COMMENT ON COLUMN product_videos.r2_deletion_retry_count IS 'R2削除リトライ回数';

-- 削除失敗したレコードを確認するためのビュー
CREATE OR REPLACE VIEW product_videos_pending_r2_deletion AS
SELECT 
  id,
  product_id,
  title,
  video_url,
  r2_video_key,
  r2_thumbnail_key,
  r2_deletion_retry_count,
  created_at,
  updated_at
FROM product_videos
WHERE r2_deletion_failed = TRUE
ORDER BY r2_deletion_retry_count DESC, updated_at DESC;

COMMENT ON VIEW product_videos_pending_r2_deletion IS 'R2削除失敗した動画一覧（リトライ対象）';
