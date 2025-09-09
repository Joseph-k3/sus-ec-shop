-- ordersテーブルに必要なカラムを追加
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total_amount integer,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- RLSポリシーを更新
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（もし存在する場合）
DROP POLICY IF EXISTS "Enable insert for all users" ON orders;
DROP POLICY IF EXISTS "Enable select for all users" ON orders;

-- 全てのユーザーに対して挿入を許可
CREATE POLICY "Enable insert for all users"
ON public.orders FOR INSERT
WITH CHECK (true);

-- 全てのユーザーに対して参照を許可
CREATE POLICY "Enable select for all users"
ON public.orders FOR SELECT
USING (true);
