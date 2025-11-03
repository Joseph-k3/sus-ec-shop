-- 商品動画管理テーブルの作成
-- 2025-01-06作成

-- product_videos テーブル
CREATE TABLE IF NOT EXISTS product_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES succulents(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT, -- 動画のサムネイル画像URL
  title TEXT, -- 動画のタイトル
  description TEXT, -- 動画の説明
  duration INTEGER, -- 動画の長さ（秒）
  file_size BIGINT, -- ファイルサイズ（バイト）
  mime_type TEXT DEFAULT 'video/mp4', -- MIMEタイプ
  display_order INTEGER DEFAULT 0, -- 表示順序
  is_primary BOOLEAN DEFAULT FALSE, -- メイン動画フラグ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON product_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_display_order ON product_videos(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_videos_primary ON product_videos(product_id, is_primary) WHERE is_primary = TRUE;

-- RLS (Row Level Security) ポリシー
ALTER TABLE product_videos ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除してから作成
DROP POLICY IF EXISTS "Anyone can view product videos" ON product_videos;
DROP POLICY IF EXISTS "Authenticated users can insert product videos" ON product_videos;
DROP POLICY IF EXISTS "Authenticated users can update product videos" ON product_videos;
DROP POLICY IF EXISTS "Authenticated users can delete product videos" ON product_videos;

-- 読み取りポリシー（全員が閲覧可能）
CREATE POLICY "Anyone can view product videos" ON product_videos
  FOR SELECT USING (TRUE);

-- 挿入ポリシー（認証されたユーザーのみ）
CREATE POLICY "Authenticated users can insert product videos" ON product_videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 更新ポリシー（認証されたユーザーのみ）
CREATE POLICY "Authenticated users can update product videos" ON product_videos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 削除ポリシー（認証されたユーザーのみ）
CREATE POLICY "Authenticated users can delete product videos" ON product_videos
  FOR DELETE USING (auth.role() = 'authenticated');

-- プライマリ動画の一意制約（商品ごとに1つのみ）
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_videos_unique_primary 
ON product_videos(product_id) 
WHERE is_primary = TRUE;

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_product_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_videos_updated_at ON product_videos;
CREATE TRIGGER trigger_update_product_videos_updated_at
  BEFORE UPDATE ON product_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_product_videos_updated_at();

-- コメント追加
COMMENT ON TABLE product_videos IS '商品動画情報テーブル';
COMMENT ON COLUMN product_videos.product_id IS '商品ID（succulentsテーブルへの外部キー）';
COMMENT ON COLUMN product_videos.video_url IS '動画ファイルのURL';
COMMENT ON COLUMN product_videos.thumbnail_url IS '動画のサムネイル画像URL';
COMMENT ON COLUMN product_videos.title IS '動画のタイトル';
COMMENT ON COLUMN product_videos.description IS '動画の説明';
COMMENT ON COLUMN product_videos.duration IS '動画の長さ（秒）';
COMMENT ON COLUMN product_videos.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN product_videos.mime_type IS 'MIMEタイプ（video/mp4, video/webm等）';
COMMENT ON COLUMN product_videos.display_order IS '表示順序';
COMMENT ON COLUMN product_videos.is_primary IS 'メイン動画フラグ（商品ごとに1つのみ）';
