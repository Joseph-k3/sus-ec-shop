-- サイト公開期間を管理するテーブル
CREATE TABLE site_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    publish_start timestamp with time zone NOT NULL,
    publish_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLSの設定
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能なポリシー
CREATE POLICY "Anyone can view site settings" ON site_settings
    FOR SELECT
    TO public
    USING (true);

-- 管理者のみ編集可能なポリシー
CREATE POLICY "Only admins can insert/update site settings" ON site_settings
    FOR ALL
    TO authenticated
    USING (auth.role() = 'admin')
    WITH CHECK (auth.role() = 'admin');

-- サンプルデータの挿入
INSERT INTO site_settings (publish_start, publish_end)
VALUES ('2025-07-17 00:00:00+09', '2025-07-17 20:59:59+09');
