# R2動画削除の堅牢化実装完了

## 📋 実装内容

### 1. R2オブジェクトキーをSupabaseに保存
- `product_videos`テーブルに以下のカラムを追加:
  - `r2_video_key`: 動画のR2オブジェクトキー
  - `r2_thumbnail_key`: サムネイルのR2オブジェクトキー
  - `r2_deletion_failed`: R2削除失敗フラグ
  - `r2_deletion_retry_count`: リトライ回数

### 2. アップロード時にR2キーを自動保存
- `uploadVideoToR2()`でR2キーを返却
- `addProductVideo()`でR2キーをDBに保存
- URLからキーを自動抽出する`extractR2KeyFromUrl()`関数

### 3. 削除処理の堅牢化
- **Supabase → R2の順で削除**
  - まずDBから確実に削除
  - その後R2から物理削除
- **R2削除失敗時もエラーにしない**
  - ログに警告を出力
  - 後でリトライ可能
- **R2キー指定での削除**
  - `deleteFromR2ByKey()`でキー指定削除
  - URLパース失敗リスクを排除

### 4. Edge Functionの活用
- Supabase Edge Function (`r2-delete`)経由でR2削除
- AWS SDK v3で直接R2にアクセス
- 認証トークン付きで安全な削除

## 🔧 変更ファイル

### フロントエンド
- `src/lib/productVideos.js`
  - `extractR2KeyFromUrl()`: URLからR2キーを抽出
  - `addProductVideo()`: R2キーを保存
  - `uploadVideoToR2()`: R2キーを返却
  - `deleteProductVideo()`: Supabase→R2の順で削除
  - `deleteFromR2ByKey()`: キー指定削除

- `src/components/AdminProductEdit.vue`
  - アップロード時にR2キーを渡す処理を追加

### バックエンド
- `supabase/functions/r2-delete/index.ts`
  - R2削除Edge Function（既存）

### データベース
- `sql/add_r2_object_keys.sql`
  - マイグレーションSQL
  - 既存データのR2キー抽出

## ✅ 動作フロー

### アップロード時
```
1. ファイル選択
2. R2にアップロード
3. R2キーを取得（例: products/2025/11/videos/xxx.mov）
4. Supabaseに保存（video_url + r2_video_key）
```

### 削除時
```
1. Supabaseから動画データ取得（r2_video_keyを含む）
2. Supabaseから削除（確実に削除）
3. R2から削除（r2_video_keyを使用）
   - 成功: ログ出力
   - 失敗: 警告ログ（エラーにしない）
4. 完了
```

## 🚀 セットアップ手順

### 1. マイグレーション実行
```bash
# MIGRATION_R2_KEYS.md の手順に従ってSQLを実行
```

### 2. Edge Functionデプロイ（既にデプロイ済み）
```bash
npx supabase functions deploy r2-delete
```

### 3. 環境変数確認（Supabase Dashboard）
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`

### 4. テスト
1. 動画をアップロード
2. Supabaseで`r2_video_key`が保存されているか確認
3. 動画を削除
4. R2で物理削除されているか確認

## 🔍 トラブルシューティング

### R2削除失敗時
```sql
-- 削除失敗したレコードを確認
SELECT * FROM product_videos_pending_r2_deletion;
```

### 手動でR2から削除
1. Cloudflare R2ダッシュボードにアクセス
2. バケット内のファイルを手動削除

### リトライスクリプト（今後実装可能）
- 削除失敗フラグを見て自動リトライ
- バッチ処理で定期実行

## 📊 メリット

✅ **確実な削除**: URLパース失敗リスクがゼロ
✅ **DB優先**: Supabaseから先に削除するのでゴミデータが残らない
✅ **リトライ可能**: R2削除失敗時も後で対応可能
✅ **既存データ対応**: 既存動画のR2キーも自動抽出
✅ **デバッグ容易**: 詳細なログで問題箇所を特定

## 🎯 今後の改善案

1. **リトライスクリプト**: 削除失敗したファイルを自動リトライ
2. **バッチ削除**: 古いファイルを一括削除
3. **削除ログ**: 削除履歴をテーブルに保存
4. **監視**: R2削除失敗を通知
