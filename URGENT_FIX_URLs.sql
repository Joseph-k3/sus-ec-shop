-- 緊急: 不正なURLを即座に修正
-- 実行: Supabase SQL Editorで実行してください

-- 1. product_imagesテーブルの修正
UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE image_url LIKE '%.r2.devproducts/%';

UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devimages/', '.r2.dev/images/')
WHERE image_url LIKE '%.r2.devimages/%';

UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE image_url LIKE '%.r2.devvideos/%';

-- 2. product_videosテーブルの修正
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE video_url LIKE '%.r2.devproducts/%';

UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devimages/', '.r2.dev/images/')
WHERE video_url LIKE '%.r2.devimages/%';

UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE video_url LIKE '%.r2.devvideos/%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE thumbnail_url LIKE '%.r2.devproducts/%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devimages/', '.r2.dev/images/')
WHERE thumbnail_url LIKE '%.r2.devimages/%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE thumbnail_url LIKE '%.r2.devvideos/%';

-- 3. succulentsテーブルの修正
UPDATE succulents
SET image = REPLACE(image, '.r2.devproducts/', '.r2.dev/products/')
WHERE image LIKE '%.r2.devproducts/%';

UPDATE succulents
SET image = REPLACE(image, '.r2.devimages/', '.r2.dev/images/')
WHERE image LIKE '%.r2.devimages/%';

-- 4. 確認
SELECT 
  'product_images' as table_name,
  COUNT(*) as fixed_count
FROM product_images
WHERE image_url LIKE 'https://pub-%.r2.dev/%';

SELECT 
  'product_videos' as table_name,
  COUNT(*) as fixed_count
FROM product_videos
WHERE video_url LIKE 'https://pub-%.r2.dev/%';

-- 5. 不正なURLが残っていないか確認
SELECT 
  'Still broken (product_images)' as status,
  COUNT(*) as count
FROM product_images
WHERE image_url LIKE '%.r2.dev%' 
  AND image_url NOT LIKE 'https://%.r2.dev/%';

SELECT 
  'Still broken (product_videos)' as status,
  COUNT(*) as count
FROM product_videos
WHERE (video_url LIKE '%.r2.dev%' AND video_url NOT LIKE 'https://%.r2.dev/%')
   OR (thumbnail_url LIKE '%.r2.dev%' AND thumbnail_url NOT LIKE 'https://%.r2.dev/%');
