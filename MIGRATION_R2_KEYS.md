# R2オブジェクトキー追加マイグレーション実行ガイド

## 📋 実行手順

### 1. Supabase ダッシュボードにアクセス
https://supabase.com/dashboard

### 2. プロジェクトを選択

### 3. 左メニューから「SQL Editor」を開く

### 4. 以下のSQLを実行

```sql
-- R2オブジェクトキーを保存するカラムを追加
ALTER TABLE product_videos 
ADD COLUMN IF NOT EXISTS r2_video_key TEXT,
ADD COLUMN IF NOT EXISTS r2_thumbnail_key TEXT,
ADD COLUMN IF NOT EXISTS r2_deletion_failed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS r2_deletion_retry_count INTEGER DEFAULT 0;

-- 既存データのR2キーを抽出してセット
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
COMMENT ON COLUMN product_videos.r2_video_key IS 'R2ストレージの動画オブジェクトキー';
COMMENT ON COLUMN product_videos.r2_thumbnail_key IS 'R2ストレージのサムネイルオブジェクトキー';
COMMENT ON COLUMN product_videos.r2_deletion_failed IS 'R2削除失敗フラグ';
COMMENT ON COLUMN product_videos.r2_deletion_retry_count IS 'R2削除リトライ回数';
```

### 5. 実行後の確認

```sql
-- 既存データのR2キーが正しく設定されているか確認
SELECT 
  id,
  video_url,
  r2_video_key,
  thumbnail_url,
  r2_thumbnail_key
FROM product_videos
LIMIT 10;
```

## ✅ 完了

マイグレーション完了後、新しいコードで動画の削除が確実に行えるようになります。

## 🔄 ロールバック（必要な場合）

```sql
ALTER TABLE product_videos 
DROP COLUMN IF EXISTS r2_video_key,
DROP COLUMN IF EXISTS r2_thumbnail_key,
DROP COLUMN IF EXISTS r2_deletion_failed,
DROP COLUMN IF EXISTS r2_deletion_retry_count;
```
