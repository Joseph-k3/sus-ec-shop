# 動画機能セットアップガイド

## 1. Supabase Storageバケットの作成

動画アップロード機能を使用するには、Supabase Storageにバケットを作成する必要があります。

### 手順

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. **Storageメニューを開く**
   - 左サイドバーの「Storage」をクリック

3. **新しいバケットを作成**
   - 「Create a new bucket」ボタンをクリック
   - **Name**: `product_videos` （アンダースコアを使用）
   - **Public bucket**: ✅ チェックを入れる
   - 「Create bucket」をクリック

4. **確認**
   - バケット一覧に `product_videos` が表示されていればOK

## 2. データベーステーブルの確認

`product_videos` テーブルは以下のマイグレーションで作成されています：

```
supabase/migrations/20250106_create_product_videos.sql
```

### 確認コマンド

```bash
node check-product-videos-table.js
```

✅ が表示されればテーブルは正常に作成されています。

## 3. 動画アップロードのテスト

1. 管理画面にログイン
2. 商品追加または編集画面を開く
3. 「🎬 動画を追加」ボタンをクリック
4. MP4, WebM, MOV形式の動画を選択（最大100MB）
5. サムネイルが自動生成されることを確認
6. 商品を保存

## トラブルシューティング

### エラー: "product_videos テーブルが存在しません"

```bash
# Supabase SQL Editorでマイグレーションを実行
cat supabase/migrations/20250106_create_product_videos.sql
```

上記の内容をコピーして、Supabase Dashboard → SQL Editor に貼り付けて実行してください。

### エラー: "product_videos バケットが見つかりません"

上記の「1. Supabase Storageバケットの作成」の手順を実行してください。

### エラー: "動画のアップロードに失敗"

1. バケットがPublicになっているか確認
2. ファイルサイズが100MB以下か確認
3. 対応形式（MP4, WebM, MOV）か確認

## ファイル構成

- `src/lib/productVideos.js` - 動画管理のロジック
- `src/components/AdminProductEdit.vue` - 商品管理画面
- `src/components/R2VideoPlayer.vue` - 動画プレイヤー
- `supabase/migrations/20250106_create_product_videos.sql` - テーブル定義

## 使用されているテーブル・バケット名

✅ **推奨（統一済み）:**
- テーブル: `product_videos`（アンダースコア）
- バケット: `product_videos`（アンダースコア）
