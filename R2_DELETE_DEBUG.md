# R2削除デバッグガイド

## 🔍 削除できない原因の確認手順

### ステップ1: Supabaseのカラムが追加されているか確認

1. Supabase Dashboard → SQL Editor
2. 以下のSQLを実行:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'product_videos'
  AND column_name LIKE '%r2%';
```

**期待される結果:**
- `r2_video_key` (text)
- `r2_thumbnail_key` (text)
- `r2_deletion_failed` (boolean)
- `r2_deletion_retry_count` (integer)

もし何も表示されない場合 → **MIGRATION_R2_KEYS.mdのSQLを実行してください**

---

### ステップ2: 既存動画のR2キーが設定されているか確認

```sql
SELECT 
  id,
  video_url,
  r2_video_key,
  CASE 
    WHEN r2_video_key IS NULL AND video_url LIKE '%r2.dev/%' THEN '❌ キーが未設定'
    WHEN r2_video_key IS NOT NULL THEN '✅ キー設定済み'
    ELSE '⚠️ R2以外'
  END as status
FROM product_videos
ORDER BY created_at DESC;
```

もし`r2_video_key`がNULLの場合 → **以下のUPDATE文を実行**:

```sql
UPDATE product_videos
SET r2_video_key = SUBSTRING(video_url FROM POSITION('r2.dev/' IN video_url) + 7)
WHERE r2_video_key IS NULL 
  AND video_url LIKE '%r2.dev/%';
```

---

### ステップ3: 削除時のログ確認

ブラウザで動画削除ボタンをクリックして、コンソールに以下が出るか確認:

**期待されるログ:**
```
🗑️ deleteProductVideo開始: <videoId>
📹 動画データ取得結果: { videoData: {...}, r2_video_key: "products/..." }
🗄️ Supabaseから削除開始
✅ Supabase削除完了
🟢 R2削除処理を実行
🗑️ 動画ファイル削除開始（キー使用）: products/2025/11/videos/xxx.mov
🗑️ deleteFromR2ByKey開始: products/2025/11/videos/xxx.mov
📡 Supabase Edge Function経由でR2削除: products/2025/11/videos/xxx.mov
```

---

### ステップ4: Edge Functionのログ確認

1. Supabase Dashboard → Edge Functions → r2-delete
2. Logs タブを開く
3. 削除実行後のログを確認

**期待されるログ:**
```
Received DELETE request for key: products/2025/11/videos/xxx.mov
Successfully deleted from R2
```

**エラーが出ている場合の確認:**
- `R2環境変数が設定されていません` → Edge Functionに環境変数を設定
- `NoSuchKey` → キーが間違っている（URLとキーの不一致）
- `AccessDenied` → R2のAPI Tokenの権限不足

---

### ステップ5: R2に実際にファイルが残っているか確認

Cloudflare Dashboard:
1. R2 → Buckets → sus-ec-images
2. `products/2025/11/videos/` フォルダを確認
3. 削除したはずのファイルが残っているか確認

---

## 🛠️ トラブルシューティング

### 問題: r2_video_keyがNULL

**原因:** マイグレーションSQLが実行されていない、または新規アップロードでキーが保存されていない

**解決策:**
1. `MIGRATION_R2_KEYS.md`のSQLを実行
2. 新規動画アップロードでキーが保存されるか確認

### 問題: Edge Functionが呼ばれていない

**原因:** 認証エラー、Edge FunctionのURL間違い

**解決策:**
```javascript
// productVideos.js の deleteFromR2ByKey で以下を確認
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Session:', session)
```

### 問題: R2のAPIキーの権限不足

**原因:** R2 API TokenがReadのみ、またはバケット指定が間違っている

**解決策:**
1. Cloudflare Dashboard → R2 → API Tokens
2. TokenのPermissionsを確認（Object Read & Writeが必要）
3. Bucket accessが`sus-ec-images`になっているか確認

---

## ✅ 正常動作の確認方法

1. 新規動画をアップロード
2. DBで`r2_video_key`が保存されていることを確認
3. 動画を削除
4. DBから削除されていることを確認
5. R2からも削除されていることを確認

```sql
-- 削除後にDBに残っていないことを確認
SELECT * FROM product_videos WHERE id = '<削除したID>';
-- → 結果: 0件
```
