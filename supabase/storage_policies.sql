-- ストレージバケット「product-videos」のRLSポリシー設定
-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください

-- 全員が動画を閲覧できるポリシー（読み取り）
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-videos' );

-- 認証されたユーザーが動画をアップロードできるポリシー（挿入）
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-videos' AND auth.role() = 'authenticated' );

-- 認証されたユーザーが動画を更新できるポリシー
CREATE POLICY "Authenticated users can update videos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-videos' AND auth.role() = 'authenticated' );

-- 認証されたユーザーが動画を削除できるポリシー
CREATE POLICY "Authenticated users can delete videos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-videos' AND auth.role() = 'authenticated' );
