# Cloudflare R2バケット作成手順

## バケット作成（画像用）

1. **Cloudflare Dashboard** → **「R2 Object Storage」**
2. **「Create bucket」** をクリック
3. 設定：
   - **Bucket name**: `sus-ec-images`
   - **Location**: `Asia Pacific (APAC)` 推奨
4. **「Create bucket」** をクリック

## パブリックアクセス設定

1. 作成したバケット（`sus-ec-images`）をクリック
2. **「Settings」** タブを選択
3. **「Public access」** セクションで：
   - **「Allow Access」** を有効化
   - **「Save」** をクリック

## パブリックURL確認

バケット作成後、以下のようなURLでアクセス可能：
```
https://pub-{your_account_id}.r2.dev/sus-ec-images/
```

## カスタムドメイン設定（オプション）

### 独自ドメインを使用する場合：
1. バケット → **「Settings」** → **「Custom Domains」**
2. **「Connect Domain」** をクリック
3. ドメイン名入力: `images.sus-ec-shop.com`
4. DNS設定を更新（CNAME追加）

### 利点：
- ブランド統一
- より高速な配信
- SEO効果
