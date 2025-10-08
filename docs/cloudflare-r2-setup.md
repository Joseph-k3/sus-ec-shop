# Cloudflare R2 セットアップガイド

## 1. Cloudflare R2バケット作成

### Cloudflareダッシュボードでの設定
1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. 「R2 Object Storage」をクリック
3. 「Create bucket」で以下のバケットを作成：
   - `sus-ec-images` (画像用)
   - `sus-ec-videos` (動画用・将来用)

### パブリックアクセス設定
各バケットで：
1. バケット → Settings → Public access
2. 「Allow Access」を有効化
3. カスタムドメインを設定（推奨）：
   - `images.sus-ec-shop.com`
   - `videos.sus-ec-shop.com`

## 2. API設定

### API Token作成
1. Cloudflare Dashboard → My Profile → API Tokens
2. 「Create Token」→ 「Custom token」
3. 権限設定：
   - Zone: Zone Settings:Read, Zone:Read
   - Account: Cloudflare R2:Edit
   - Resources: Include All accounts

### 環境変数
`.env`に以下を追加：
```
# Cloudflare R2
VITE_CLOUDFLARE_ACCOUNT_ID=your_account_id
VITE_CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_CLOUDFLARE_R2_BUCKET_NAME=sus-ec-images
VITE_CLOUDFLARE_R2_PUBLIC_URL=https://images.sus-ec-shop.com
```

## 3. S3互換性

Cloudflare R2はS3互換APIを提供するため、AWS SDK使用可能：
- エンドポイント: `https://{account_id}.r2.cloudflarestorage.com`
- 署名バージョン: v4
