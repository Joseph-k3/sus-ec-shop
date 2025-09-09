-- succulentsテーブルに数量と予約状態を追加
ALTER TABLE succulents 
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN is_reserved BOOLEAN NOT NULL DEFAULT false;

-- RLSポリシーの更新（全ユーザーが読み取り可能）
CREATE POLICY "全ユーザーが閲覧可能" ON succulents
FOR SELECT USING (true);

-- 管理者のみ更新可能
CREATE POLICY "管理者のみ更新可能" ON succulents
FOR UPDATE USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
