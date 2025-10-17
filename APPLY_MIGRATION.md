# product_imagesテーブルへの画像登録問題の解決方法

## 問題の概要
`product_images`テーブルに画像情報が登録されない問題が発生しています。

## 原因の可能性
1. マイグレーション `20250107_add_storage_provider_to_images.sql` がリモートデータベースに適用されていない
2. テーブルに必要なカラム（`storage_provider`, `storage_key`, `storage_bucket`, `original_filename`, `file_size`, `mime_type`）が存在しない
3. RLSポリシーの権限設定の問題

## 解決手順

### ステップ1: マイグレーションの適用確認
Supabase Dashboard → SQL Editorで以下のSQLを実行して、カラムが存在するか確認：

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'product_images' 
ORDER BY ordinal_position;
```

### ステップ2: カラムが存在しない場合、マイグレーションを適用
Supabase Dashboard → SQL Editorで以下のSQLを実行：

```sql
-- 画像テーブルにストレージプロバイダー情報を追加
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'succulents-images',
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_product_images_storage_provider 
ON product_images(storage_provider);

-- コメント追加
COMMENT ON COLUMN product_images.storage_provider IS 'ストレージプロバイダー（supabase, cloudflare_r2）';
COMMENT ON COLUMN product_images.storage_key IS 'ストレージ内のキー（R2用）';
COMMENT ON COLUMN product_images.storage_bucket IS 'ストレージバケット名';
COMMENT ON COLUMN product_images.original_filename IS '元のファイル名';
COMMENT ON COLUMN product_images.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN product_images.mime_type IS 'MIMEタイプ';
```

### ステップ3: RLSポリシーの確認
管理者権限でログインしているか確認してください。

```sql
-- 現在のユーザーが管理者か確認
SELECT u.id, u.email, u.is_admin
FROM users u
WHERE u.id = auth.uid();
```

管理者でない場合は、以下のSQLで管理者権限を付与：

```sql
-- 自分のメールアドレスを指定
UPDATE users 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### ステップ4: デバッグログの確認
商品を新規登録する際、ブラウザの開発者ツール（F12キー）でコンソールを開き、以下のログを確認：

1. `🚀 一時画像のアップロード開始:` - アップロード開始
2. `📤 画像 X/Y アップロード中:` - 各画像のアップロード
3. `📝 データベースに保存するデータ:` - DBに保存するデータ内容
4. `✅ データベース保存成功:` - 保存成功
5. `❌ データベース保存エラー:` - エラー発生時の詳細

エラーが発生する場合、エラーメッセージの内容を確認してください。

## よくあるエラーと対処法

### エラー: "relation 'product_images' does not exist"
→ テーブル自体が存在しない。`20250926_create_product_images_table.sql` を適用してください。

### エラー: "column 'storage_provider' of relation 'product_images' does not exist"
→ ステップ2のマイグレーションを適用してください。

### エラー: "new row violates row-level security policy"
→ ステップ3で管理者権限を確認してください。

### エラー: "insert or update on table 'product_images' violates foreign key constraint"
→ `product_id` が `succulents` テーブルに存在しない可能性があります。

## テスト方法

1. 管理画面で新規商品を作成
2. 画像を選択（複数可）
3. 商品を保存
4. ブラウザのコンソールでログを確認
5. Supabase Dashboard → Table Editor → `product_images` でデータが登録されているか確認

## デバッグコードの追加箇所

- `/src/lib/productImagesR2.js` の `uploadProductImage` 関数
- `/src/components/AdminProductEdit.vue` の `uploadTempImages`, `uploadSingleImage` 関数

詳細なログが出力されるようになっています。
