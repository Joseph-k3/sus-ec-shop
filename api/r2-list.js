import AWS from 'aws-sdk'

// R2設定
const r2 = new AWS.S3({
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4'
})

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📂 R2バケット内ファイル一覧取得開始')
    
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    
    if (!bucketName) {
      throw new Error('R2バケット名が設定されていません')
    }
    
    // バケット内のオブジェクト一覧を取得
    const params = {
      Bucket: bucketName,
      MaxKeys: 1000 // 最大1000件まで取得
    }
    
    const data = await r2.listObjectsV2(params).promise()
    
    console.log('✅ ファイル一覧取得成功:', data.Contents.length, '件')
    
    // レスポンス用にファイル情報を整形
    const files = data.Contents.map(obj => ({
      key: obj.Key,
      url: `${publicUrl}${obj.Key}`,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag
    }))
    
    // 画像ファイルのみをフィルタリング
    const imageFiles = files.filter(file => {
      const ext = file.key.toLowerCase().split('.').pop()
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
    })
    
    console.log('🖼️ 画像ファイル:', imageFiles.length, '件')
    
    res.status(200).json({
      success: true,
      total: files.length,
      imageCount: imageFiles.length,
      files: imageFiles, // 画像ファイルのみを返す
      allFiles: files.length, // 全ファイル数も参考情報として含める
      bucket: bucketName,
      publicUrl: publicUrl
    })
    
  } catch (error) {
    console.error('❌ R2ファイル一覧取得エラー:', error)
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
        hasCredentials: !!(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)
      }
    })
  }
}
