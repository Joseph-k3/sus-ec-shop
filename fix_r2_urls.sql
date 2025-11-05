-- 不正なR2 URLを修正するスクリプト
-- 問題: https://pub-xxx.r2.devproducts/... のようにスラッシュが欠けている

-- 1. product_videosテーブルのvideo_urlを修正
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE video_url LIKE '%.r2.devproducts/%';

-- 2. product_videosテーブルのthumbnail_urlを修正
UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE thumbnail_url LIKE '%.r2.devproducts/%';

-- 3. product_videosテーブルのvideo_urlを修正（imagesフォルダ）
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devimages/', '.r2.dev/images/')
WHERE video_url LIKE '%.r2.devimages/%';

-- 4. product_videosテーブルのthumbnail_urlを修正（imagesフォルダ）
UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devimages/', '.r2.dev/images/')
WHERE thumbnail_url LIKE '%.r2.devimages/%';

-- 5. product_videosテーブルのvideo_urlを修正（videosフォルダ）
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE video_url LIKE '%.r2.devvideos/%';

-- 6. product_videosテーブルのthumbnail_urlを修正（videosフォルダ）
UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE thumbnail_url LIKE '%.r2.devvideos/%';

-- 7. product_imagesテーブルのimage_urlも修正
UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE image_url LIKE '%.r2.devproducts/%';

UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devimages/', '.r2.dev/images/')
WHERE image_url LIKE '%.r2.devimages/%';

-- 8. succulentsテーブルのimageも修正
UPDATE succulents
SET image = REPLACE(image, '.r2.devproducts/', '.r2.dev/products/')
WHERE image LIKE '%.r2.devproducts/%';

UPDATE succulents
SET image = REPLACE(image, '.r2.devimages/', '.r2.dev/images/')
WHERE image LIKE '%.r2.devimages/%';

-- 確認クエリ：修正後のURLを確認
SELECT 
  id,
  video_url,
  thumbnail_url
FROM product_videos
WHERE video_url LIKE '%r2.dev%'
ORDER BY created_at DESC;

-- 問題があるURLを検索（念のため）
SELECT 
  'product_videos' as table_name,
  id,
  video_url as url,
  'video_url' as column_name
FROM product_videos
WHERE video_url NOT LIKE '%.r2.dev/%' AND video_url LIKE '%.r2.dev%'
UNION ALL
SELECT 
  'product_videos' as table_name,
  id,
  thumbnail_url as url,
  'thumbnail_url' as column_name
FROM product_videos
WHERE thumbnail_url NOT LIKE '%.r2.dev/%' AND thumbnail_url LIKE '%.r2.dev%'
UNION ALL
SELECT 
  'product_images' as table_name,
  id,
  image_url as url,
  'image_url' as column_name
FROM product_images
WHERE image_url NOT LIKE '%.r2.dev/%' AND image_url LIKE '%.r2.dev%'
ORDER BY table_name, id;

-- R2動画URL一括修正SQL
-- 旧Supabase動画URLをR2のURLに置換する例
-- 必要に応じて旧URL/新URLを編集してください

UPDATE product_videos
SET video_url = REPLACE(video_url, 'https://旧URL/', 'https://新しいR2のURL/')
WHERE video_url LIKE 'https://旧URL/%';

-- 例: 旧URLが supabase.co/storage/v1/object/public/product-videos/ で
-- 新URLが https://xxxx.r2.cloudflarestorage.com/videos/ の場合
-- UPDATE product_videos
-- SET video_url = REPLACE(video_url, 'https://xxxx.supabase.co/storage/v1/object/public/product-videos/', 'https://xxxx.r2.cloudflarestorage.com/videos/')
-- WHERE video_url LIKE 'https://xxxx.supabase.co/storage/v1/object/public/product-videos/%';
