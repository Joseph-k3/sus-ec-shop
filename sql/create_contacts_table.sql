-- contactsテーブルの作成
CREATE TABLE contacts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLSの設定
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 誰でも問い合わせを送信できるポリシー
CREATE POLICY "Anyone can insert contacts" ON contacts
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 管理者のみ閲覧可能なポリシー
CREATE POLICY "Only admins can view contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (auth.role() = 'admin');
