# Supabaseストレージ設定ガイド

## 📋 目次

- [🚨 即座にエラーを解決したい](#-ストレージのアクセス権限がありませんエラーの解決手順)
- [概要](#概要)
- [自動設定](#自動設定)
- [手動設定（推奨）](#手動設定推奨)
- [緊急対処法](#緊急対処法)
- [画面操作による詳細手順](#6-画面操作による詳細手順)
- [トラブルシューティング](#トラブルシューティング)

## ⚡ クイックスタート

**画像アップロードエラーが出ている場合、以下のいずれかを実行：**

1. **最も簡単**: Supabase管理画面 → Storage → succulents-images → Settings → Row Level Security を OFF
2. **推奨**: SQL Editor で以下を実行
   ```sql
   CREATE POLICY "Allow all for development" ON storage.objects
   FOR ALL USING (bucket_id = 'succulents-images');
   ```

---

## 概要
商品管理画面で画像アップロード機能を使用するために、Supabaseストレージの設定が必要です。

## 自動設定
AdminProductEdit.vueコンポーネントは以下を自動的に行います：
- `succulents-images` ストレージバケットの存在確認
- バケットが存在しない場合の自動作成
- 適切な設定での初期化

## 手動設定（推奨）

### 1. Supabase管理画面でのバケット作成

1. Supabase プロジェクトダッシュボードにログイン
2. 左メニューから「Storage」を選択
3. 「Create Bucket」をクリック
4. バケット名: `succulents-images`
5. Public bucket: `✓ チェックを入れる`
6. File size limit: `10485760` (10MB)
7. Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif`
8. 「Save」をクリック

**重要**: バケット作成後、必ずRLSポリシーを設定してください（手順2参照）。

### 2. Row Level Security (RLS) ポリシー設定

**手順**:
1. Supabase管理画面で「Storage」→「Policies」を選択
2. 「New Policy」をクリック
3. 以下の4つのポリシーを作成：

**重要**: ポリシー作成時は「Get started quickly」ではなく、「For full customization create a policy from scratch」を選択してください。

#### 読み取りポリシー（公開アクセス）
```sql
-- ポリシー名: Public read access
-- 対象: SELECT
-- ロール: public
-- 条件: bucket_id = 'succulents-images'

CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'succulents-images');
```

#### 書き込みポリシー（認証ユーザー）
```sql
-- ポリシー名: Authenticated users can upload
-- 対象: INSERT
-- ロール: authenticated
-- 条件: bucket_id = 'succulents-images'

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'succulents-images' AND auth.role() = 'authenticated');
```

#### 更新ポリシー（認証ユーザー）
```sql
-- ポリシー名: Authenticated users can update
-- 対象: UPDATE
-- ロール: authenticated
-- 条件: bucket_id = 'succulents-images'

CREATE POLICY "Authenticated users can update" ON storage.objects
FOR UPDATE USING (bucket_id = 'succulents-images' AND auth.role() = 'authenticated');
```

#### 削除ポリシー（認証ユーザー）
```sql
-- ポリシー名: Authenticated users can delete
-- 対象: DELETE
-- ロール: authenticated
-- 条件: bucket_id = 'succulents-images'

CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE USING (bucket_id = 'succulents-images' AND auth.role() = 'authenticated');
```

## トラブルシューティング

### 「Bucket not found」エラー
- バケットが作成されていない
- バケット名が間違っている（`succulents-images`である必要がある）

### 「Row Level Security」エラー
- RLSポリシーが設定されていない
- 認証されていないユーザーがアップロードを試行している

### 「Permission denied」エラー
- ユーザーが適切に認証されていない
- RLSポリシーの条件が厳しすぎる

### ファイルサイズエラー
- 10MBを超えるファイルをアップロードしようとしている
- バケットのファイルサイズ制限を確認

## 確認方法

1. **バケット存在確認**:
   ```javascript
   const { data: buckets } = await supabase.storage.listBuckets()
   console.log(buckets) // 'succulents-images'が含まれているか確認
   ```

2. **アップロードテスト**:
   ```javascript
   const { data, error } = await supabase.storage
     .from('succulents-images')
     .upload('test.jpg', file)
   console.log(data, error)
   ```

3. **公開URL取得テスト**:
   ```javascript
   const { data } = supabase.storage
     .from('succulents-images')
     .getPublicUrl('test.jpg')
   console.log(data.publicUrl)
   ```

## 緊急対処法

### RLSポリシーエラーで画像アップロードができない場合

#### 1. 一時的な解決策（開発環境のみ）
Supabase管理画面で以下の設定を行ってください：

1. **Storage** → **Settings** → **RLS disabled**
2. または **Storage** → **Policies** → **Disable RLS**

⚠️ **警告**: 本番環境では絶対に無効化しないでください。セキュリティリスクがあります。

#### 2. 簡単なポリシーの作成

最低限の動作を確認するため、以下の簡単なポリシーを作成：

```sql
-- すべてのユーザーに読み書き権限を与える（開発環境のみ）
CREATE POLICY "Allow all access for development" ON storage.objects
FOR ALL USING (bucket_id = 'succulents-images');
```

⚠️ **注意**: これは開発環境専用です。本番環境では適切な認証ベースのポリシーを使用してください。

#### 3. バケットが作成できない場合の手動作成

画面からバケット作成ができない場合、SQL Editorで直接作成：

```sql
-- SQL Editorで実行
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'succulents-images',
  'succulents-images', 
  true, 
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

## 🚨 「ストレージのアクセス権限がありません」エラーの解決手順

このエラーが出る場合は、以下の手順で解決してください：

### 1. 即座に解決する方法（開発環境推奨）

#### A. RLSを一時的に無効化
1. Supabase管理画面にログイン
2. **Storage** → **Settings** を選択
3. **Row Level Security** の設定で `succulents-images` バケットのRLSを無効化
4. または、**Storage** → **Policies** で該当バケットの「Disable RLS」をクリック

#### B. 全アクセス許可ポリシーを作成（開発環境のみ）
1. Supabase管理画面 → **Storage** → **Policies**
2. **New Policy** をクリック
3. **For full customization create a policy from scratch** を選択
4. 以下の設定：
   - **Policy name**: `Allow all for development`
   - **Allowed operation**: `All`
   - **Target roles**: `public`
   - **USING expression**: `bucket_id = 'succulents-images'`
   - **WITH CHECK expression**: `bucket_id = 'succulents-images'`
5. **Save policy** をクリック

### 2. 本番環境向けの適切な権限設定

#### A. 認証必須のポリシー設定
認証されたユーザーのみアクセス可能にする場合：

1. **読み取り権限（公開）**:
```sql
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'succulents-images');
```

2. **書き込み権限（認証ユーザーのみ）**:
```sql
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'succulents-images' 
  AND auth.role() = 'authenticated'
);
```

3. **更新権限（認証ユーザーのみ）**:
```sql
CREATE POLICY "Authenticated update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'succulents-images' 
  AND auth.role() = 'authenticated'
);
```

4. **削除権限（認証ユーザーのみ）**:
```sql
CREATE POLICY "Authenticated delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'succulents-images' 
  AND auth.role() = 'authenticated'
);
```

#### B. 匿名ユーザーも許可する場合
開発やテスト目的で匿名ユーザーでもアップロード可能にする場合：

```sql
-- 全ユーザーに読み書き権限
CREATE POLICY "Allow all operations" ON storage.objects
FOR ALL USING (bucket_id = 'succulents-images')
WITH CHECK (bucket_id = 'succulents-images');
```

### 3. SQLエディターでの直接設定

Supabase管理画面の **SQL Editor** で以下を実行：

```sql
-- 既存のポリシーを削除（必要に応じて）
DROP POLICY IF EXISTS "Allow all for development" ON storage.objects;

-- 開発環境用：全アクセス許可
CREATE POLICY "Allow all for development" ON storage.objects
FOR ALL 
USING (bucket_id = 'succulents-images')
WITH CHECK (bucket_id = 'succulents-images');

-- または、本番環境用：認証ユーザーのみ
CREATE POLICY "Public read, auth write" ON storage.objects
FOR SELECT USING (bucket_id = 'succulents-images');

CREATE POLICY "Authenticated write" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'succulents-images' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

### 4. 設定確認方法

#### A. ポリシーが適用されているか確認
```sql
-- 現在のポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

#### B. バケット設定確認
```sql
-- バケット設定を確認
SELECT * FROM storage.buckets WHERE name = 'succulents-images';
```

### 5. 最も簡単な解決法（緊急時）

**今すぐ動作させたい場合**：

1. Supabase管理画面
2. **Storage** → **succulents-images** バケット
3. **Settings** タブ
4. **Public access** を `ON` に設定
5. **Row Level Security** を `OFF` に設定

⚠️ **注意**: この設定は開発時のみ使用し、本番環境では適切なRLSポリシーを設定してください。

### 6. 画面操作による詳細手順

#### 方法1: RLSを無効化（最も簡単）

1. **Supabase管理画面にアクセス**
   - https://supabase.com/dashboard にログイン
   - プロジェクトを選択

2. **Storageページに移動**
   - 左サイドバーの「Storage」をクリック

3. **バケット設定を変更**
   - `succulents-images` バケットをクリック
   - 右上の「Settings」タブをクリック
   - 「Row Level Security」を `Disabled` に変更
   - 「Update」をクリック

#### 方法2: ポリシーを作成（推奨）

1. **Policiesページに移動**
   - Storage → 「Policies」をクリック

2. **新しいポリシーを作成**
   - 「New Policy」ボタンをクリック
   - 「For full customization create a policy from scratch」を選択

3. **ポリシー設定**
   ```
   Policy name: Allow all for development
   Allowed operation: All
   Target roles: public
   USING expression: bucket_id = 'succulents-images'
   WITH CHECK expression: bucket_id = 'succulents-images'
   ```

4. **保存**
   - 「Review」→「Save policy」をクリック

#### 方法3: SQLエディターで実行（上級者向け）

1. **SQL Editorに移動**
   - 左サイドバーの「SQL Editor」をクリック

2. **新しいクエリを作成**
   - 「New query」をクリック

3. **SQLを実行**
   ```sql
   -- 開発環境用の全アクセス許可ポリシー
   CREATE POLICY "Allow all for development" ON storage.objects
   FOR ALL 
   USING (bucket_id = 'succulents-images')
   WITH CHECK (bucket_id = 'succulents-images');
   ```

4. **実行**
   - 「Run」ボタンをクリック

### 7. 動作確認

設定後、以下で動作確認：

1. **管理画面で画像アップロードをテスト**
2. **エラーが出ないことを確認**
3. **アップロードされた画像が表示されることを確認**

### 8. よくある質問

**Q: ポリシーを作成したのにまだエラーが出る**
A: ブラウザのキャッシュをクリアするか、プライベートモードで試してください。

**Q: 本番環境でも同じ設定で良い？**
A: いいえ。本番環境では認証されたユーザーのみアクセス可能にしてください。

**Q: 複数のポリシーがある場合は？**
A: 既存のポリシーと競合する可能性があります。一度すべて削除してから作り直してください。

### 9. データベーステーブル構造のエラー

#### エラー例
```
Could not find the 'instagram' column of 'succulents' in the schema cache
```

#### 原因と解決方法

**原因**: フォームで送信しているフィールドがデータベースのテーブルに存在しない

**解決方法**:

1. **テーブル構造を確認**
   ```sql
   -- SQL Editorで実行
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'succulents';
   ```

2. **必要なカラムを追加**（必要に応じて）
   ```sql
   -- 例：instagramカラムを追加する場合
   ALTER TABLE succulents ADD COLUMN instagram TEXT;
   ```

3. **不要なフィールドをコードから削除**（推奨）
   - AdminProductEdit.vueの`currentProduct`から不要なフィールドを削除
   - `select()`文で必要なカラムのみを指定

#### 現在のsucculentsテーブル構造（期待値）
```sql
CREATE TABLE succulents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_reserved BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
