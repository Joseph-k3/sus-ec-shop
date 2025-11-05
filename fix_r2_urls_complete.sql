-- R2 URLの修正スクリプト（完全版）
-- 実行日: 2025-01-XX
-- 目的: 不正なURLを正しい形式に修正

-- ============================================
-- パターン1: スラッシュ欠落の修正
-- ============================================

-- 1. product_videosテーブルのvideo_urlを修正
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE video_url LIKE '%.r2.devproducts/%';

UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devimages/', '.r2.dev/images/')
WHERE video_url LIKE '%.r2.devimages/%';

UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE video_url LIKE '%.r2.devvideos/%';

-- 2. product_videosテーブルのthumbnail_urlを修正
UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE thumbnail_url LIKE '%.r2.devproducts/%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devimages/', '.r2.dev/images/')
WHERE thumbnail_url LIKE '%.r2.devimages/%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devvideos/', '.r2.dev/videos/')
WHERE thumbnail_url LIKE '%.r2.devvideos/%';

-- 3. product_imagesテーブルのimage_urlを修正
UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE image_url LIKE '%.r2.devproducts/%';

UPDATE product_images
SET image_url = REPLACE(image_url, '.r2.devimages/', '.r2.dev/images/')
WHERE image_url LIKE '%.r2.devimages/%';

-- 4. succulentsテーブルのimageを修正
UPDATE succulents
SET image = REPLACE(image, '.r2.devproducts/', '.r2.dev/products/')
WHERE image LIKE '%.r2.devproducts/%';

UPDATE succulents
SET image = REPLACE(image, '.r2.devimages/', '.r2.dev/images/')
WHERE image LIKE '%.r2.devimages/%';

-- ============================================
-- パターン2: ダブルスラッシュの修正
-- ============================================

-- 5. product_imagesテーブルのダブルスラッシュを修正
UPDATE product_images
SET image_url = REGEXP_REPLACE(image_url, '([^:])//+', '\1/', 'g')
WHERE image_url LIKE '%//%' AND image_url NOT LIKE 'https://%';

UPDATE product_images
SET image_url = REPLACE(image_url, 'https:/', 'https://')
WHERE image_url LIKE 'https:/%' AND image_url NOT LIKE 'https://%';

-- 6. product_videosテーブルの動画URLのダブルスラッシュを修正
UPDATE product_videos
SET video_url = REGEXP_REPLACE(video_url, '([^:])//+', '\1/', 'g')
WHERE video_url LIKE '%//%' AND video_url NOT LIKE 'https://%';

UPDATE product_videos
SET video_url = REPLACE(video_url, 'https:/', 'https://')
WHERE video_url LIKE 'https:/%' AND video_url NOT LIKE 'https://%';

-- 7. product_videosテーブルのサムネイルURLのダブルスラッシュを修正
UPDATE product_videos
SET thumbnail_url = REGEXP_REPLACE(thumbnail_url, '([^:])//+', '\1/', 'g')
WHERE thumbnail_url LIKE '%//%' 
  AND thumbnail_url NOT LIKE 'https://%'
  AND thumbnail_url IS NOT NULL;

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, 'https:/', 'https://')
WHERE thumbnail_url LIKE 'https:/%' 
  AND thumbnail_url NOT LIKE 'https://%'
  AND thumbnail_url IS NOT NULL;

-- 8. succulentsテーブルのダブルスラッシュを修正
UPDATE succulents
SET image = REGEXP_REPLACE(image, '([^:])//+', '\1/', 'g')
WHERE image LIKE '%//%' AND image NOT LIKE 'https://%';

UPDATE succulents
SET image = REPLACE(image, 'https:/', 'https://')
WHERE image LIKE 'https:/%' AND image NOT LIKE 'https://%';

-- ============================================
-- 結果確認
-- ============================================

-- 修正後の画像URLをチェック
SELECT 
  id, 
  image_url,
  CASE 
    WHEN image_url LIKE '%//%' AND image_url NOT LIKE 'https://%' THEN '❌ ダブルスラッシュあり'
    WHEN image_url LIKE '%.r2.dev%/%' AND image_url NOT LIKE '%.r2.dev/%' THEN '❌ スラッシュ欠落'
    WHEN image_url LIKE 'https://%' THEN '✅ 正常'
    ELSE '⚠️ 要確認'
  END as status
FROM product_images
ORDER BY created_at DESC
LIMIT 10;

-- 修正後の動画URLをチェック
SELECT 
  id, 
  video_url,
  thumbnail_url,
  CASE 
    WHEN video_url LIKE '%//%' OR thumbnail_url LIKE '%//%' THEN '❌ ダブルスラッシュあり'
    WHEN video_url LIKE '%.r2.dev%/%' AND video_url NOT LIKE '%.r2.dev/%' THEN '❌ スラッシュ欠落'
    WHEN video_url LIKE 'https://%' THEN '✅ 正常'
    ELSE '⚠️ 要確認'
  END as status
FROM product_videos
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 統計情報
-- ============================================

-- 修正が必要なURL数をカウント
SELECT 
  '画像URL（スラッシュ欠落）' as type,
  COUNT(*) as count
FROM product_images
WHERE image_url LIKE '%.r2.dev%/%' AND image_url NOT LIKE '%.r2.dev/%';

SELECT 
  '画像URL（ダブルスラッシュ）' as type,
  COUNT(*) as count
FROM product_images
WHERE image_url LIKE '%//%' AND image_url NOT LIKE 'https://%';

SELECT 
  '動画URL（スラッシュ欠落）' as type,
  COUNT(*) as count
FROM product_videos
WHERE (video_url LIKE '%.r2.dev%/%' AND video_url NOT LIKE '%.r2.dev/%')
   OR (thumbnail_url LIKE '%.r2.dev%/%' AND thumbnail_url NOT LIKE '%.r2.dev/%');

SELECT 
  '動画URL（ダブルスラッシュ）' as type,
  COUNT(*) as count
FROM product_videos
WHERE (video_url LIKE '%//%' AND video_url NOT LIKE 'https://%')
   OR (thumbnail_url LIKE '%//%' AND thumbnail_url NOT LIKE 'https://%');

-- 注意事項:
-- 1. このスクリプトは本番環境で実行する前に、必ずバックアップを取得してください
-- 2. まずテスト環境で動作確認することを推奨します
-- 3. 修正後、アプリケーションで画像・動画が正しく表示されることを確認してください
