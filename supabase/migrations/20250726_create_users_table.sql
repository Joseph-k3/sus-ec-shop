-- users テーブルの作成
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- RLSポリシーの設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーテーブルのポリシー
CREATE POLICY "ユーザーは自分の情報のみ参照可能" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

CREATE POLICY "管理者は全てのユーザーを参照可能" ON users
    FOR ALL USING (
        is_admin = true AND 
        auth.uid() = id
    );

-- 初期管理者ユーザーの作成（あなたのメールアドレスに置き換えてください）
INSERT INTO users (id, email, is_admin)
SELECT 
    id,
    email,
    TRUE
FROM auth.users
WHERE email = 'ryosk8er1026@yahoo.co.jp' -- ここを実際の管理者メールアドレスに変更
ON CONFLICT (id) DO UPDATE
SET is_admin = TRUE;
