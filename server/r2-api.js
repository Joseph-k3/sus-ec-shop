// Express.jsでCloudflare R2 API サーバー
import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import multer from 'multer'
import path from 'path'

// 環境変数を読み込み
config()

const app = express()
const PORT = process.env.API_PORT || 3001

// ミドルウェア（ペイロードサイズ制限を増やす）
app.use(cors())
app.use(express.json({ limit: '250mb' }))
app.use(express.urlencoded({ limit: '250mb', extended: true }))

// R2 S3互換クライアント
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

// multerでファイルアップロード設定
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/mov'
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`許可されていないファイル形式: ${file.mimetype}`), false)
    }
  }
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
      'video/mp4', 'video/webm', 'video/quicktime', 'video/mov'
    ]

    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: `許可されていないファイルタイプ: ${contentType}` 
      })
    }

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(fileBuffer, 'base64'),
      ContentType: contentType,
    })

    await r2Client.send(command)

    // 公開URLを生成（末尾スラッシュを正規化してから連結）
    let baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }
    const publicUrl = `${baseUrl}/${key}`

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

// R2直接アップロードAPI (multer使用)
app.post('/api/r2-upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    const { type, productId = 'general' } = req.body

    if (!file) {
      return res.status(400).json({ error: 'ファイルが選択されていません' })
    }

    // ファイル拡張子を取得
    const fileExt = path.extname(file.originalname).toLowerCase()
    
    // 現在の年月を取得
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // ファイル名を生成（年月ベース + タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const typeFolder = type === 'video' ? 'videos' : 'images'
    const fileName = `products/${year}/${month}/${typeFolder}/${timestamp}-${randomStr}${fileExt}`

    // R2にアップロード
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await r2Client.send(uploadCommand)

    // 公開URLを生成（末尾スラッシュを正規化してから連結）
    let baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    // 末尾スラッシュを削除
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }
    const publicUrl = `${baseUrl}/${fileName}`

    console.log(`✅ ファイルアップロード成功: ${fileName}`)
    console.log(`📍 公開URL: ${publicUrl}`)
    
    res.status(200).json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      type: type || 'image'
    })

  } catch (error) {
    console.error('❌ R2アップロードエラー:', error)
    
    // 環境変数の確認
    console.error('Environment variables check:')
    console.error('CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_ACCESS_KEY_ID:', process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_SECRET_ACCESS_KEY:', process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_BUCKET_NAME:', process.env.CLOUDFLARE_R2_BUCKET_NAME)
    console.error('CLOUDFLARE_R2_PUBLIC_URL:', process.env.CLOUDFLARE_R2_PUBLIC_URL)
    
    res.status(500).json({
      error: 'アップロードに失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// R2削除API - ヘルスチェック
app.get('/api/r2-delete/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'R2削除APIサーバーは正常に動作しています',
    timestamp: new Date().toISOString()
  })
})

// R2ファイル削除API
// DELETEとPOSTの両方を受け付ける
app.post('/api/r2-delete', async (req, res) => {
  try {
    const { fileKey } = req.body

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKeyが必要です' })
    }

    console.log('🗑️ R2からファイルを削除:', fileKey)

    // バケット名を取得
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME

    // R2から削除
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    await r2Client.send(deleteCommand)

    console.log('✅ R2削除成功:', fileKey)
    
    res.status(200).json({
      success: true,
      message: 'ファイルを削除しました',
      fileKey: fileKey
    })

  } catch (error) {
    console.error('❌ R2削除エラー:', error)
    
    // ファイルが存在しない場合は成功として扱う
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      console.log('📄 ファイルが存在しないため削除完了:', req.body.fileKey)
      return res.status(200).json({
        success: true,
        message: 'ファイルは既に存在しないため削除完了',
        fileKey: req.body.fileKey
      })
    }
    
    res.status(500).json({
      error: 'ファイル削除に失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  console.log(`   POST http://localhost:${PORT}/api/r2-upload`)
  console.log(`   DELETE http://localhost:${PORT}/api/r2-delete`)
  console.log(`   GET http://localhost:${PORT}/api/health`)
})
