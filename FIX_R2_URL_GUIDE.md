# R2動画・画像URL修正ガイド

## 🚨 問題

動画のサムネイルが真っ黒で、動画が再生できない。

### 原因

R2アップロードAPI（`api/r2-upload.js`）でURLを生成する際、公開URLとファイル名を連結する時にスラッシュが欠けていた。

**不正なURL:**
```
❌ https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.devproducts/2025/11/videos/xxx.mov
                                                    ↑ スラッシュがない
```

**正しいURL:**
```
✅ https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev/products/2025/11/videos/xxx.mov
                                                    ↑ スラッシュが必要
```

## ✅ 修正内容

### 1. api/r2-upload.js の修正

公開URLの末尾スラッシュを自動で追加するように修正：

```javascript
// 修正前
const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
const publicUrl = `${publicBaseUrl}${fileName}` // スラッシュが欠ける

// 修正後
let publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

// 公開URLの末尾スラッシュを正規化
if (publicBaseUrl && !publicBaseUrl.endsWith('/')) {
  publicBaseUrl = publicBaseUrl + '/'
}

const publicUrl = `${publicBaseUrl}${fileName}` // 正しくスラッシュで連結
```

### 2. 既存の不正なURLをDBで修正

`fix_r2_urls.sql`を実行して、既にDBに保存されている不正なURLを修正します。

## 📋 修正手順

### ステップ1: コードの修正を確認

✅ `api/r2-upload.js` が修正済みであることを確認

### ステップ2: Supabase SQL Editorで不正なURLを修正

1. Supabase Dashboard → SQL Editor を開く
2. `fix_r2_urls.sql`の内容をコピー
3. SQL Editorに貼り付けて実行
4. 結果を確認

**実行されるSQL:**
```sql
-- product_videosテーブルのvideo_urlを修正
UPDATE product_videos
SET video_url = REPLACE(video_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE video_url LIKE '%.r2.devproducts/%';

-- product_videosテーブルのthumbnail_urlを修正
UPDATE product_videos
SET thumbnail_url = REPLACE(thumbnail_url, '.r2.devproducts/', '.r2.dev/products/')
WHERE thumbnail_url LIKE '%.r2.devproducts/%';

-- その他のテーブルとカラムも同様に修正...
```

### ステップ3: 開発サーバーを再起動

```bash
# 現在のサーバーを停止（Ctrl+C）
# 再起動
npm run dev
```

### ステップ4: 動作確認

1. ブラウザで商品一覧ページにアクセス
2. 動画がある商品のサムネイルが正しく表示されることを確認
3. サムネイルをクリックして動画が再生できることを確認
4. ブラウザコンソールで以下のログを確認：

**期待されるログ:**
```
✅ 商品「test」の動画取得成功: 1 本
動画データ: [{
  video_url: 'https://pub-xxx.r2.dev/products/2025/11/videos/xxx.mov',
  thumbnail_url: 'https://pub-xxx.r2.dev/products/2025/11/images/xxx.jpg',
  ...
}]
🎬 動画URL処理: {
  original_video: 'https://pub-xxx.r2.dev/products/2025/11/videos/xxx.mov',
  processed_video: 'https://pub-xxx.r2.dev/products/2025/11/videos/xxx.mov',
  original_thumbnail: 'https://pub-xxx.r2.dev/products/2025/11/images/xxx.jpg',
  processed_thumbnail: 'https://pub-xxx.r2.dev/products/2025/11/images/xxx.jpg'
}
```

**NG（不正なURL）:**
```
❌ https://pub-xxx.r2.devproducts/... ← スラッシュがない
```

### ステップ5: 新規アップロードのテスト

1. 商品管理画面で新しい動画をアップロード
2. 動画URLが正しく生成されることを確認
3. サムネイルが正しく表示されることを確認

## 🔍 トラブルシューティング

### まだサムネイルが表示されない

**確認事項:**
1. SQLが正しく実行されたか確認
2. ブラウザのキャッシュをクリア（Ctrl+Shift+R / Cmd+Shift+R）
3. ブラウザコンソールでURLを確認

**確認SQL:**
```sql
-- 不正なURLが残っていないか確認
SELECT 
  id,
  video_url,
  thumbnail_url
FROM product_videos
WHERE 
  video_url NOT LIKE '%.r2.dev/%' 
  AND video_url LIKE '%.r2.dev%'
ORDER BY created_at DESC;
```

### 動画は再生できるがサムネイルが表示されない

**原因:** サムネイルのURLが不正

**解決策:**
1. `fix_r2_urls.sql`を再実行
2. または、商品管理画面で動画を再アップロード

### 新規アップロード時にまだ不正なURLが生成される

**確認事項:**
1. `api/r2-upload.js`が保存されているか確認
2. 開発サーバーが再起動されているか確認
3. `.env`ファイルの`CLOUDFLARE_R2_PUBLIC_URL`を確認

## 📦 修正ファイル

1. ✅ `api/r2-upload.js` - 公開URL生成時のスラッシュ処理を修正
2. ✅ `fix_r2_urls.sql` - 既存の不正なURLを修正するSQL
3. ✅ `FIX_R2_URL_GUIDE.md` - この修正ガイド

## 🚀 本番環境へのデプロイ

修正を本番環境に反映する場合：

```bash
# 変更をコミット
git add api/r2-upload.js fix_r2_urls.sql
git commit -m "fix: R2 URL生成時のスラッシュ欠落を修正"

# プッシュ（自動デプロイ）
git push origin main
```

**重要:** 本番環境でも`fix_r2_urls.sql`を実行してください！

## ✅ チェックリスト

- [ ] `api/r2-upload.js`が修正されている
- [ ] `fix_r2_urls.sql`をSupabaseで実行した
- [ ] 開発サーバーを再起動した
- [ ] 既存の動画サムネイルが表示される
- [ ] 既存の動画が再生できる
- [ ] 新規動画アップロードが正しいURLで保存される
- [ ] ブラウザコンソールで正しいURLが確認できる
- [ ] 本番環境にデプロイした（必要な場合）
- [ ] 本番環境でもSQLを実行した（必要な場合）

これで動画のサムネイルが正しく表示され、動画も再生できるようになります！🎬✨
