# 動画アップロード問題の修正内容

## 問題の原因

### 1. エラー: "null value in column 'video_url' violates not-null constraint"
- **原因**: R2への動画アップロードが失敗した際、`uploadResult.videoUrl`が`null`または`undefined`のまま、データベースへの保存処理(`addProductVideo`)が実行されていた。
- **発生箇所**: 
  - `AdminProductEdit.vue`の`uploadTempVideos`関数
  - `AdminProductEdit.vue`の`uploadSingleVideo`関数

### 2. 100MBファイルサイズ制限エラー
- **原因**: `/api/r2-upload.js`のformidableの`maxFileSize`設定が50MBになっていた。
- **影響**: 50MB以上の動画ファイルをアップロードしようとすると、サーバー側でエラーが発生。

## 修正内容

### 1. AdminProductEdit.vue の修正

#### `uploadTempVideos`関数
```javascript
// 修正前: アップロード失敗時もDBへの保存を試みていた
const uploadResult = await uploadVideoToStorage(tempVideo.file, ...)
const savedVideo = await addProductVideo(...) // エラー時もここが実行される

// 修正後: アップロード結果を検証し、失敗時は個別のエラーをthrow
try {
  const uploadResult = await uploadVideoToStorage(tempVideo.file, ...)
  
  // アップロード結果の検証
  if (!uploadResult || !uploadResult.videoUrl) {
    throw new Error('動画URLが取得できませんでした')
  }
  
  // サムネイルアップロード...
  
  // DB保存
  await addProductVideo(productId, uploadResult.videoUrl, ...)
  
} catch (videoError) {
  // 個別の動画エラーをキャッチし、上位に伝える
  throw new Error(`動画「${tempVideo.title}」のアップロードに失敗: ${videoError.message}`)
}
```

#### `uploadSingleVideo`関数
```javascript
// アップロード結果の検証を追加
const uploadResult = await uploadVideoToStorage(file, ...)

if (!uploadResult || !uploadResult.videoUrl) {
  throw new Error('動画のアップロードに失敗しました。動画URLが取得できませんでした。')
}

// DB保存処理...
```

#### `handleSubmit`関数（商品保存時）
```javascript
// 画像と動画のアップロードエラーを個別にキャッチ
if (tempImages.value.length > 0) {
  try {
    await uploadTempImages(savedProductId)
  } catch (imageError) {
    alert(`画像のアップロードに失敗しました:\n\n${imageError.message}\n\n商品は保存されましたが、画像は保存されませんでした。`)
  }
}

if (tempVideos.value.length > 0) {
  try {
    await uploadTempVideos(savedProductId)
  } catch (videoError) {
    alert(`動画のアップロードに失敗しました:\n\n${videoError.message}\n\n商品は保存されましたが、動画は保存されませんでした。\n\n後で商品を編集して動画を追加してください。`)
  }
}
```

### 2. /api/r2-upload.js の修正

#### ファイルサイズ制限の拡張
```javascript
// 修正前
maxFileSize: 50 * 1024 * 1024, // 50MB

// 修正後
maxFileSize: 200 * 1024 * 1024, // 200MB (動画対応)
```

#### ファイルサイズ超過エラーの検知
```javascript
let fields, files
try {
  [fields, files] = await form.parse(req)
} catch (parseError) {
  if (parseError.code === 1009 || parseError.httpCode === 413) {
    return res.status(413).json({
      error: 'ファイルサイズが大きすぎます（最大: 200MB）',
      code: 'LIMIT_FILE_SIZE',
      details: parseError.message
    })
  }
  throw parseError
}
```

#### エラーレスポンスの改善
```javascript
} catch (error) {
  let errorMessage = 'アップロードに失敗しました'
  let statusCode = 500
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    errorMessage = 'ファイルサイズが大きすぎます（最大: 200MB）'
    statusCode = 413
  } else if (error.message) {
    errorMessage = error.message
  }
  
  res.status(statusCode).json({
    error: errorMessage,
    details: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  })
}
```

### 3. src/lib/productVideos.js の修正

#### uploadVideoToR2のエラーハンドリング改善
```javascript
if (!response.ok) {
  let errorMessage = `R2アップロードエラー: ${response.status} ${response.statusText}`
  
  try {
    const errorData = await response.json()
    console.error('❌ R2アップロードAPIエラー詳細:', errorData)
    
    if (errorData.error) {
      errorMessage = errorData.error
    }
    if (errorData.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'ファイルサイズが大きすぎます（最大: 200MB）'
    }
  } catch (parseError) {
    const errorText = await response.text()
    console.error('❌ R2アップロードAPIエラー (テキスト):', errorText)
    if (errorText) {
      errorMessage += ` - ${errorText}`
    }
  }
  
  throw new Error(errorMessage)
}
```

#### デバッグログの追加
```javascript
console.log('🌥️ R2へのアップロードを開始:', {
  fileName: file.name,
  fileSize: file.size,
  fileSizeMB: Math.round(file.size / 1024 / 1024),
  fileType: file.type
})

// ファイルサイズチェック
if (file.size > maxSize) {
  const errorMsg = `ファイルサイズが大きすぎます (最大: 200MB, 実際: ${Math.round(file.size / 1024 / 1024)}MB)`
  console.error('❌', errorMsg)
  throw new Error(errorMsg)
}

console.log('✅ ファイルサイズチェック通過')
console.log('📝 生成されたファイル名:', fileName)
```

## 修正後の動作フロー

### 動画アップロード成功時
1. ファイルサイズをチェック（200MB以内）✅
2. R2に動画をアップロード ✅
3. `uploadResult.videoUrl`を検証 ✅
4. サムネイルを生成してR2にアップロード ✅
5. DBに動画情報を保存（`video_url`に有効な値） ✅

### 動画アップロード失敗時
1. ファイルサイズが200MB超過 → エラーメッセージ表示、DB保存はスキップ ✅
2. R2アップロードAPI失敗 → エラーメッセージ表示、DB保存はスキップ ✅
3. アップロード結果に`videoUrl`なし → エラーメッセージ表示、DB保存はスキップ ✅

### ユーザーへのエラー通知
- 明確なエラーメッセージ（どのファイルが失敗したか、原因は何か）
- 商品保存成功/動画アップロード失敗の場合は「後で編集して動画を追加」と案内
- ファイルサイズ超過の場合は実際のサイズと制限値を表示

## テスト項目

- [ ] 50MB以下の動画ファイルをアップロード → 成功
- [ ] 50MB〜200MBの動画ファイルをアップロード → 成功
- [ ] 200MB超の動画ファイルをアップロード → 適切なエラーメッセージ表示
- [ ] R2接続エラー時 → 適切なエラーメッセージ表示、DB保存はスキップ
- [ ] 新規商品作成時の動画アップロード → 成功
- [ ] 既存商品への動画追加 → 成功
- [ ] 複数動画の同時アップロード → 全て成功、または失敗した動画のみエラー表示
- [ ] product_videosテーブルに正しくvideo_urlとthumbnail_urlが保存される ✅

## 注意事項

- R2の環境変数が正しく設定されていることを確認
- Vercel/本番環境でも200MBの制限が有効か確認（Vercelのファンクション制限に注意）
- 非常に大きなファイルの場合、アップロード時間が長くなる可能性がある
