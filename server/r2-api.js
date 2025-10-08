// Express.jsでCloudflare R2 API サーバー
import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// 環境変数を読み込み
config()

const app = express()
const PORT = process.env.API_PORT || 3001

// ミドルウェア
app.use(cors())
app.use(express.json())

// R2 S3互換クライアント
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

// 署名付きURLを生成するAPI
app.post('/api/r2/presigned-url', async (req, res) => {
  try {
    const { key, contentType, maxFileSize = 10 * 1024 * 1024 } = req.body

    // バリデーション
    if (!key || !contentType) {
      return res.status(400).json({ 
        error: 'key と contentType は必須です' 
      })
    }

    // ファイルタイプの検証
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'text/plain' // テスト用
    ]
    
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: `許可されていないファイルタイプ: ${contentType}` 
      })
    }

    // セキュリティチェック
    if (key.includes('..') || key.startsWith('/')) {
      return res.status(400).json({ 
        error: '無効なファイルキーです' 
      })
    }

    // 署名付きURL生成
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: maxFileSize,
      Metadata: {
        'upload-timestamp': Date.now().toString(),
        'uploaded-by': 'sus-ec-site'
      }
    })

    const signedUrl = await getSignedUrl(r2Client, command, { 
      expiresIn: 3600 // 1時間有効
    })

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    res.json({
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
      key: key,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('❌ 署名付きURL生成エラー:', error)
    res.status(500).json({ 
      error: '署名付きURL生成に失敗しました',
      details: error.message 
    })
  }
})

// ファイル削除API
app.delete('/api/r2/delete-file', async (req, res) => {
  try {
    const { key } = req.body

    if (!key) {
      return res.status(400).json({ error: 'key は必須です' })
    }

    // セキュリティチェック
    if (key.includes('..') || key.startsWith('/')) {
      return res.status(400).json({ error: '無効なファイルキーです' })
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key
    })

    await r2Client.send(command)

    res.json({
      success: true,
      message: 'ファイルが削除されました',
      key: key
    })

  } catch (error) {
    console.error('❌ R2ファイル削除エラー:', error)
    res.status(500).json({ 
      error: 'ファイル削除に失敗しました',
      details: error.message 
    })
  }
})

// サーバーサイドプロキシアップロードAPI
app.post('/api/r2/upload', async (req, res) => {
  try {
    const { key, contentType } = req.body
    const fileBuffer = req.files?.file?.data || req.body.fileData

    if (!key || !contentType || !fileBuffer) {
      return res.status(400).json({ 
        error: 'key, contentType, fileData は必須です' 
      })
    }

    // ファイルタイプの検証
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'text/plain' // テスト用
    ]
    
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: `許可されていないファイルタイプ: ${contentType}` 
      })
    }

    // 直接R2にアップロード
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        'upload-timestamp': Date.now().toString(),
        'uploaded-by': 'sus-ec-site'
      }
    })

    await r2Client.send(command)

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    res.json({
      success: true,
      publicUrl: publicUrl,
      key: key,
      message: 'ファイルがアップロードされました'
    })

  } catch (error) {
    console.error('❌ サーバーサイドアップロードエラー:', error)
    res.status(500).json({ 
      error: 'アップロードに失敗しました',
      details: error.message 
    })
  }
})

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Cloudflare R2 API Server is running',
    timestamp: new Date().toISOString()
  })
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 R2 API サーバーがポート ${PORT} で起動しました`)
  console.log(`📡 エンドポイント:`)
  console.log(`   POST http://localhost:${PORT}/api/r2/presigned-url`)
  console.log(`   DELETE http://localhost:${PORT}/api/r2/delete-file`)
  console.log(`   POST http://localhost:${PORT}/api/r2/upload`)
  console.log(`   GET http://localhost:${PORT}/api/health`)
})

export default app
