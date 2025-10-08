# Supabaseでの動画バケット作成手順

## 1. Supabaseダッシュボードにアクセス

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクト `hcqgfdyentwazmyikvtl` を選択

## 2. Storageバケットを作成

1. 左サイドバーの **「Storage」** をクリック
2. **「Create a new bucket」** をクリック
3. 以下の設定でバケットを作成：
   - **Bucket name**: `product-videos`
   - **Public bucket**: ☑️ **チェックを入れる**（重要！）
   - **File size limit**: 100MB
   - **Allowed MIME types**: 空白のまま（すべて許可）

## 3. バケット作成の確認

作成後、Storage画面で以下を確認：
- `product-videos` バケットが一覧に表示される
- バケット名の横に「🌐 Public」マークが表示される

## 4. 権限設定（自動で設定されるはず）

バケット作成時にPublicに設定していれば、以下のRLSポリシーが自動で設定されます：
- 読み取り：全員可能
- 書き込み：認証されたユーザーのみ

## トラブルシューティング

### バケットが見つからない場合
- バケット名が正確に `product-videos` になっているか確認
- Publicに設定されているか確認

### アップロードエラーの場合  
- ログインしているか確認
- ファイルサイズが100MB以下か確認
