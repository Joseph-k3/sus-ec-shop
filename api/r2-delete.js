import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

// R2クライアントの設定（VITE_プレフィックス付きとなしの両方をサポート）
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.VITE_CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', ['DELETE', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { fileKey } = req.body

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKeyが必要です' })
    }

    console.log('🗑️ R2からファイルを削除:', {
      fileKey,
      method: req.method
    })

    // バケット名を取得
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME

    console.log('📦 使用するバケット:', bucketName)

    // R2から削除
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    await r2Client.send(deleteCommand)

    console.log('✅ R2削除成功:', {
      fileKey,
      bucket: bucketName
    })
    
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
    
    // 環境変数の確認
    console.error('Environment variables check:')
    console.error('CLOUDFLARE_ACCOUNT_ID:', accountId ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_BUCKET_NAME:', bucketName)
    
    res.status(500).json({
      error: 'ファイル削除に失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
