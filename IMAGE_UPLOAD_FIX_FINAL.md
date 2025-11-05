# 画像・動画アップロード URL生成の根本修正

## 修正内容

### 1. R2アップロードAPI（api/r2-upload.js）の修正

**問題点:**
- 公開URLに末尾スラッシュを追加していたため、ダブルスラッシュが発生
- `https://pub-xxx.r2.dev//products/...` のような不正なURLが生成されていた

**修正:**
```javascript
// 修正前
if (publicBaseUrl && !publicBaseUrl.endsWith('/')) {
  publicBaseUrl = publicBaseUrl + '/'
}
const publicUrl = `${publicBaseUrl}${fileName}`

// 修正後
if (publicBaseUrl && publicBaseUrl.endsWith('/')) {
  publicBaseUrl = publicBaseUrl.slice(0, -1)
}
const publicUrl = `${publicBaseUrl}/${fileName}`
```

**結果:**
- 末尾スラッシュを必ず削除してからスラッシュで連結
- 常に正しい形式のURLが生成される: `https://pub-xxx.r2.dev/products/...`

### 2. フロントエンドR2クライアント（src/lib/cloudflareR2.js）の修正

**問題点:**
- 署名付きURLを使っていたため複雑化
- APIから返されるURLを正しく使用していなかった

**修正:**
```javascript
async uploadFile(file, key, onProgress = null) {
  // 直接R2アップロードAPIを使用
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', file.type.startsWith('video/') ? 'video' : 'image')
  
  const response = await fetch('http://localhost:3001/api/r2-upload', {
    method: 'POST',
    body: formData
  })
  
  const data = await response.json()
  return data.url  // APIから返されたURLをそのまま使用
}
```

**結果:**
- APIから正しいURLが返されるため、フロントエンドでの加工不要
- シンプルで確実な実装

### 3. .env設定の確認

**確認事項:**
```bash
# 公開URLは末尾スラッシュなしで統一
CLOUDFLARE_R2_PUBLIC_URL=https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev
VITE_CLOUDFLARE_R2_PUBLIC_URL=https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev
```

## 修正の影響範囲

### 画像アップロード
- ✅ AdminProductEdit.vue → uploadProductImageR2 → API経由でR2アップロード
- ✅ API（api/r2-upload.js）で正しいURL生成
- ✅ DBに保存されるURLは常に正しい形式

### 動画アップロード
- ✅ AdminProductEdit.vue → uploadVideoToStorage → API経由でR2アップロード
- ✅ API（api/r2-upload.js）で正しいURL生成
- ✅ DBに保存されるURLは常に正しい形式

### サムネイルアップロード
- ✅ AdminProductEdit.vue → API経由でR2アップロード
- ✅ API（api/r2-upload.js）で正しいURL生成
- ✅ DBに保存されるURLは常に正しい形式

## 既存データの修正

### 不正なURLを修正するSQL

```sql
-- 画像URLの修正
UPDATE product_images
SET image_url = REGEXP_REPLACE(image_url, '//+', '/', 'g')
WHERE image_url LIKE '%//%';

UPDATE product_images
SET image_url = REPLACE(image_url, 'https:/', 'https://')
WHERE image_url LIKE 'https:/%';

-- 動画URLの修正
UPDATE product_videos
SET video_url = REGEXP_REPLACE(video_url, '//+', '/', 'g')
WHERE video_url LIKE '%//%';

UPDATE product_videos
SET video_url = REPLACE(video_url, 'https:/', 'https://')
WHERE video_url LIKE 'https:/%';

-- サムネイルURLの修正
UPDATE product_videos
SET thumbnail_url = REGEXP_REPLACE(thumbnail_url, '//+', '/', 'g')
WHERE thumbnail_url LIKE '%//%';

UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, 'https:/', 'https://')
WHERE thumbnail_url LIKE 'https:/%';
```

## テスト手順

### 1. 新規画像アップロード
```bash
# 開発サーバー起動
npm run dev

# 別ターミナルでAPIサーバー起動
npm run server
```

1. 管理画面（http://localhost:5173/admin）にアクセス
2. 商品編集画面で画像を選択してアップロード
3. コンソールでログ確認:
   ```
   ✅ R2アップロード完了: https://pub-xxx.r2.dev/products/2024/01/images/...
   ```
4. DBを確認:
   ```sql
   SELECT image_url FROM product_images ORDER BY created_at DESC LIMIT 1;
   ```
5. URLが正しい形式（ダブルスラッシュなし）であることを確認

### 2. 新規動画アップロード
1. 商品編集画面で動画を選択してアップロード
2. コンソールでログ確認:
   ```
   ✅ R2アップロード完了: https://pub-xxx.r2.dev/products/2024/01/videos/...
   ```
3. DBを確認:
   ```sql
   SELECT video_url, thumbnail_url FROM product_videos ORDER BY created_at DESC LIMIT 1;
   ```
4. URLが正しい形式であることを確認

### 3. 表示確認
1. 商品一覧ページで画像・動画が正しく表示されることを確認
2. ブラウザのネットワークタブで、画像・動画が200 OKで読み込まれることを確認
3. 404エラーがないことを確認

## トラブルシューティング

### アップロードしても表示されない場合

1. **コンソールログを確認**
   ```javascript
   // ブラウザのコンソールで確認
   console.log('画像URL:', productImages.value)
   console.log('動画URL:', productVideos.value)
   ```

2. **DBの内容を確認**
   ```sql
   -- 最新の画像URLを確認
   SELECT id, image_url, created_at 
   FROM product_images 
   ORDER BY created_at DESC 
   LIMIT 5;
   
   -- 不正なURLを検索
   SELECT id, image_url 
   FROM product_images 
   WHERE image_url LIKE '%//%';
   ```

3. **R2バケットの公開設定を確認**
   - Cloudflare R2ダッシュボードで`sus-ec-images`バケットを開く
   - "Settings" → "Public Access" が有効になっていることを確認

4. **環境変数を再確認**
   ```bash
   # .envファイルで確認
   echo $VITE_CLOUDFLARE_R2_PUBLIC_URL
   echo $CLOUDFLARE_R2_PUBLIC_URL
   
   # 末尾にスラッシュがないことを確認
   ```

5. **サーバーを再起動**
   ```bash
   # 開発サーバーを再起動
   npm run dev
   
   # APIサーバーを再起動
   npm run server
   ```

### ダブルスラッシュが残る場合

1. **キャッシュをクリア**
   ```bash
   # ブラウザのキャッシュをクリア（Shift + Command + Delete）
   # または開発者ツールで "Disable cache" をチェック
   ```

2. **既存のURLを修正**
   ```sql
   -- 上記のSQLを実行
   ```

3. **再アップロード**
   - 問題のある画像・動画を削除して再アップロード

## 今後の注意点

1. **URL連結時は必ずスラッシュを確認**
   ```javascript
   // ❌ 悪い例
   const url = `${baseUrl}${path}`
   
   // ✅ 良い例
   const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
   const cleanPath = path.startsWith('/') ? path : '/' + path
   const url = cleanBase + cleanPath
   ```

2. **.envの公開URLは末尾スラッシュなしで統一**
   ```bash
   # ✅ 正しい
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
   
   # ❌ 誤り
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev/
   ```

3. **APIから返されるURLはそのまま使用**
   - フロントエンド側で加工しない
   - API側で正しいURLを生成する責務を持つ

## 修正完了のチェックリスト

- [x] api/r2-upload.jsのURL生成ロジック修正
- [x] src/lib/cloudflareR2.jsのuploadFile関数修正
- [x] .envの公開URL設定確認（末尾スラッシュなし）
- [ ] 既存の不正なURLをSQLで修正
- [ ] 新規画像アップロードのテスト
- [ ] 新規動画アップロードのテスト
- [ ] 商品一覧での表示確認
- [ ] 404エラーがないことを確認

## まとめ

この修正により、**新規にアップロードされる画像・動画は必ず正しいURLでDBに保存される**ようになりました。

既存の不正なURLについては、上記のSQLで一括修正してください。

修正後は、SQL修正なしで正しく表示されるようになります。
