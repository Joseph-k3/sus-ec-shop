# Cloudflare R2 CORS設定ガイド

## 問題
フロントエンドから署名付きURLを使ってR2に直接アップロードする際に、CORSエラーが発生しています。

## 解決方法

### 1. Cloudflare ダッシュボードでCORS設定

1. **Cloudflareダッシュボードにログイン**
2. **R2 Object Storage**を選択
3. **バケット名（sus-ec-images）**をクリック
4. **Settings**タブを選択
5. **CORS policy**セクションで以下のJSONを設定：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://your-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. AWS CLI を使用したCORS設定（代替方法）

```bash
# CORS設定ファイルを作成
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:5174", "https://your-domain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# AWS CLI でCORS設定を適用
aws s3api put-bucket-cors \
  --bucket sus-ec-images \
  --cors-configuration file://cors-config.json \
  --endpoint-url https://24a4534ef691765539d927beb866bf41.r2.cloudflarestorage.com
```

### 3. 設定確認

CORS設定が正しく適用されているか確認：

```bash
aws s3api get-bucket-cors \
  --bucket sus-ec-images \
  --endpoint-url https://24a4534ef691765539d927beb866bf41.r2.cloudflarestorage.com
```

## 重要事項

- **開発環境**: `http://localhost:5173`, `http://localhost:5174`
- **本番環境**: 実際のドメインを追加
- **AllowedHeaders**: `*` で全てのヘッダーを許可（開発時）
- **MaxAgeSeconds**: プリフライトリクエストのキャッシュ時間

## 設定後の確認

1. R2テストを再実行
2. ブラウザの開発者ツールでCORSエラーが解消されることを確認
3. 実際のファイルアップロードが成功することを確認
