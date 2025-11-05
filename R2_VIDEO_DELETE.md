# R2動画削除機能の実装と修正

## 問題

1. 商品管理画面で動画を削除した際、データベースからは削除されるが、R2ストレージからファイルが削除されていなかった。
2. `sus-ec-images/products/2025/11/videos/` 配下のR2に保存された動画が削除できていなかった。

## 原因

1. `src/lib/productVideos.js`の`deleteProductVideo`関数が、Supabaseストレージからの削除のみを試みており、R2ストレージに対応していなかった。
2. ファイルキーの抽出ロジックが不十分で、R2の公開URLから正しくファイルキーを抽出できていなかった。
3. `.env`の`CLOUDFLARE_R2_PUBLIC_URL`の末尾スラッシュが不統一（クライアント側とサーバー側で異なる）。

## 修正内容

### 1. src/lib/productVideos.js の修正

#### `deleteFromR2`関数のファイルキー抽出ロジックを大幅改善

**修正前の問題:**
- 公開URLの末尾スラッシュの有無を考慮していなかった
- `products/2025/11/videos/video_xxx.mp4` 形式のパスを正しく抽出できなかった
- `.r2.dev/` を含むURLのパース処理が不十分だった

**修正後のロジック:**

```javascript
const deleteFromR2 = async (fileUrl) => {
  console.log('🗑️ R2削除処理開始:', fileUrl)
  
  let publicBaseUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL
  
  // 末尾のスラッシュを正規化
  if (publicBaseUrl && !publicBaseUrl.endsWith('/')) {
    publicBaseUrl = publicBaseUrl + '/'
  }
  
  let fileKey = ''
  
  // 1. 公開URLから直接抽出
  if (publicBaseUrl && fileUrl.startsWith(publicBaseUrl)) {
    fileKey = fileUrl.replace(publicBaseUrl, '')
    console.log('✅ 公開URLから抽出:', fileKey)
  } 
  // 2. スラッシュなしの公開URLから抽出
  else if (publicBaseUrl && fileUrl.startsWith(publicBaseUrl.replace(/\/$/, ''))) {
    fileKey = fileUrl.replace(publicBaseUrl.replace(/\/$/, ''), '').replace(/^\//, '')
    console.log('✅ 公開URL（スラッシュなし）から抽出:', fileKey)
  }
  // 3. URLに .r2.dev/ が含まれる場合（汎用的な処理）
  else if (fileUrl.includes('.r2.dev/')) {
    const r2DevIndex = fileUrl.indexOf('.r2.dev/')
    fileKey = fileUrl.substring(r2DevIndex + 8) // '.r2.dev/' の後ろから取得
    console.log('✅ .r2.dev/ から抽出:', fileKey)
  }
  // 4. パス形式のみの場合
  else if (fileUrl.includes('/')) {
    const urlParts = fileUrl.split('/')
    const pathIndex = urlParts.findIndex(part => part === 'products' || part === 'videos' || part === 'images')
    if (pathIndex !== -1) {
      fileKey = urlParts.slice(pathIndex).join('/')
      console.log('✅ パス形式から抽出:', fileKey)
    } else {
      const validParts = urlParts.filter(part => part && part !== 'https:' && part !== 'http:')
      if (validParts.length >= 3) {
        fileKey = validParts.slice(-5).join('/')
        console.log('✅ 最後の5パスから抽出:', fileKey)
      }
    }
  }
  
  // 詳細なログ出力
  console.log('🗑️ R2削除リクエスト:', {
    fileUrl,
    publicBaseUrl,
    extractedFileKey: fileKey
  })
  
  // R2削除APIを呼び出し
  const response = await fetch('/api/r2-delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey })
  })
  
  // 404エラーは警告のみ（ファイルが既に削除されている場合）
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status === 404 || errorData.message?.includes('NoSuchKey')) {
      console.warn('⚠️ ファイルは既に存在しません:', fileKey)
      return
    }
    throw new Error(`R2削除エラー: ${response.status}`)
  }
}
```

**対応するURL形式:**
1. ✅ `https://pub-xxx.r2.dev/products/2025/11/videos/video_xxx.mp4`
2. ✅
```javascript
const deleteVideo = async (videoId) => {
  if (!confirm('この動画を削除しますか？\n\n※ R2ストレージからも削除されます。')) return
  
  try {
    console.log('🗑️ 動画削除開始:', videoId)
    await deleteProductVideo(videoId)
    console.log('✅ 動画削除成功:', videoId)
    
    await loadProductVideos(editingId.value)
    alert('動画を削除しました')
  } catch (error) {
    console.error('❌ 動画の削除に失敗しました:', error)
    alert('動画の削除に失敗しました:\n\n' + error.message)
  }
}
```

**改善点:**
- 削除確認メッセージに「R2ストレージからも削除される」ことを明示
- 詳細なログ出力（削除開始、削除成功）
- エラー時にエラーメッセージを表示
- 成功時に「動画を削除しました」と表示

### 3. api/r2-delete.js の修正

#### POSTメソッドのサポート追加

```javascript
export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', ['DELETE', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS')
  // ...
}
```

**理由:**
- 一部のクライアントやプロキシでDELETEメソッドが制限される場合がある
- POSTメソッドも受け付けることで互換性を向上

## 動作フロー

### 動画削除時の処理

1. **ユーザーがUIで「削除」ボタンをクリック**
   - 確認ダイアログ表示：「この動画を削除しますか？ R2ストレージからも削除されます。」

2. **`deleteVideo`関数が実行**
   - `deleteProductVideo(videoId)`を呼び出し

3. **`deleteProductVideo`関数が実行**
   - DBから動画情報を取得（video_url, thumbnail_url, storage_provider）
   - ストレージプロバイダーを確認
   
4. **R2を使用している場合**
   - `deleteFromR2(video_url)`を呼び出し → 動画ファイルをR2から削除
   - `deleteFromR2(thumbnail_url)`を呼び出し → サムネイルをR2から削除
   
5. **`deleteFromR2`関数が実行**
   - URLからファイルキーを抽出（例: `videos/video_1234567890_abc123.mp4`）
   - `/api/r2-delete` APIにDELETEリクエスト送信
   
6. **R2削除API (`/api/r2-delete`) が実行**
   - AWS SDK for JavaScriptの`DeleteObjectCommand`を使用
   - R2からファイルを削除
   - 成功レスポンスを返す
   
7. **DBから動画レコードを削除**
   - `product_videos`テーブルから該当レコードを削除
   
8. **動画一覧を再読み込み**
   - `loadProductVideos()`で最新の動画一覧を表示
   
9. **成功メッセージ表示**
   - 「動画を削除しました」

## ログ出力

### 成功時のログ

```
🗑️ 動画削除開始: <videoId>
🗑️ 動画削除開始: { videoId, video_url, thumbnail_url, storage_provider }
🗑️ R2削除リクエスト: { fileUrl, fileKey }
✅ R2削除成功: { success: true, message, fileKey }
✅ R2削除成功: <fileKey>
✅ 動画削除完了: <videoId>
✅ 動画削除成功: <videoId>
```

### エラー時のログ

```
❌ R2削除APIエラー: { status, statusText, errorData }
❌ R2削除エラー: <error>
❌ DB削除に失敗: <error>
❌ deleteProductVideo エラー: <error>
❌ 動画の削除に失敗しました: <error>
```

## テスト項目

- [ ] R2に保存された動画を削除 → R2からファイルが削除される
- [ ] R2に保存されたサムネイルも削除される
- [ ] DBから動画レコードが削除される
- [ ] 動画一覧が正しく更新される
- [ ] 削除後、再度商品を編集しても削除した動画が表示されない
- [ ] 削除確認ダイアログが表示される
- [ ] 削除成功メッセージが表示される
- [ ] 既に削除されているファイルを削除しようとしてもエラーにならない
- [ ] ブラウザコンソールに詳細なログが出力される

## 注意事項

### R2のファイルキー抽出

以下のURL形式に対応：
- `https://pub-xxx.r2.dev/videos/video_xxx.mp4` → `videos/video_xxx.mp4`
- `https://pub-xxx.r2.dev/products/2025/01/videos/video_xxx.mp4` → `products/2025/01/videos/video_xxx.mp4`
- パス形式のみの場合も対応

### エラーハンドリング

- ファイルが既に削除されている場合（`NoSuchKey`エラー）は成功として扱う
- ネットワークエラーなどの場合はユーザーにエラーメッセージを表示
- R2削除失敗時もDBからは削除される（孤立ファイル防止のため、手動クリーンアップが必要な場合がある）

## 修正ファイル

1. ✅ `/Users/apple/Desktop/sample-homepage/src/lib/productVideos.js`
2. ✅ `/Users/apple/Desktop/sample-homepage/src/components/AdminProductEdit.vue`
3. ✅ `/Users/apple/Desktop/sample-homepage/api/r2-delete.js`
