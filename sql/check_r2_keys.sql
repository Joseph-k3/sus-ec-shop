-- R2キーが保存されているか確認
SELECT 
  id,
  title,
  video_url,
  r2_video_key,
  thumbnail_url,
  r2_thumbnail_key,
  storage_provider,
  created_at
FROM product_videos
ORDER BY created_at DESC
LIMIT 10;

-- カラムが存在するか確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_videos'
  AND column_name IN ('r2_video_key', 'r2_thumbnail_key', 'r2_deletion_failed', 'r2_deletion_retry_count')
ORDER BY column_name;
