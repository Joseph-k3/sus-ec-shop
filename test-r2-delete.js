// R2削除機能のテストスクリプト
// 実際の動画URLからファイルキーが正しく抽出できるかテスト

const testUrls = [
  // パターン1: 公開URL（末尾スラッシュあり）
  'https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev/products/2025/11/videos/video_1234567890_abc123.mp4',
  
  // パターン2: 公開URL（末尾スラッシュなし）
  'https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.devproducts/2025/11/videos/video_1234567890_abc123.mp4',
  
  // パターン3: パスのみ
  'products/2025/11/videos/video_1234567890_abc123.mp4',
  
  // パターン4: サムネイル
  'https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev/products/2025/11/videos/thumb_1234567890_abc123.jpg',
]

const publicBaseUrl = 'https://pub-e3a78e43359c43d28c0a8c26913fcc6e.r2.dev'

function extractFileKey(fileUrl) {
  console.log('\n🔍 テスト:', fileUrl)
  
  let baseUrl = publicBaseUrl
  
  // 末尾のスラッシュを正規化
  if (baseUrl && !baseUrl.endsWith('/')) {
    baseUrl = baseUrl + '/'
  }
  
  let fileKey = ''
  
  // 公開URLから直接抽出
  if (baseUrl && fileUrl.startsWith(baseUrl)) {
    fileKey = fileUrl.replace(baseUrl, '')
    console.log('✅ 公開URLから抽出:', fileKey)
  } 
  // スラッシュなしの公開URLから抽出
  else if (baseUrl && fileUrl.startsWith(baseUrl.replace(/\/$/, ''))) {
    fileKey = fileUrl.replace(baseUrl.replace(/\/$/, ''), '').replace(/^\//, '')
    console.log('✅ 公開URL（スラッシュなし）から抽出:', fileKey)
  }
  // URLに pub-xxx.r2.dev が含まれる場合
  else if (fileUrl.includes('.r2.dev/')) {
    const r2DevIndex = fileUrl.indexOf('.r2.dev/')
    fileKey = fileUrl.substring(r2DevIndex + 8) // '.r2.dev/' の後ろから取得
    console.log('✅ .r2.dev/ から抽出:', fileKey)
  }
  // パス形式のみの場合
  else if (fileUrl.includes('/')) {
    const urlParts = fileUrl.split('/')
    const pathIndex = urlParts.findIndex(part => part === 'products' || part === 'videos' || part === 'images')
    if (pathIndex !== -1) {
      fileKey = urlParts.slice(pathIndex).join('/')
      console.log('✅ パス形式から抽出:', fileKey)
    } else {
      // 最後の有効なパスを取得（少なくとも3階層）
      const validParts = urlParts.filter(part => part && part !== 'https:' && part !== 'http:')
      if (validParts.length >= 3) {
        fileKey = validParts.slice(-5).join('/') // 最後の5つのパスを使用
        console.log('✅ 最後の5パスから抽出:', fileKey)
      }
    }
  }

  if (!fileKey) {
    console.warn('⚠️ ファイルキーを抽出できませんでした')
    return null
  }

  return fileKey
}

console.log('=== R2ファイルキー抽出テスト ===')
console.log('公開URL:', publicBaseUrl)

testUrls.forEach(url => {
  const key = extractFileKey(url)
  if (key) {
    console.log('📦 結果:', key)
  }
})

console.log('\n=== テスト完了 ===')
