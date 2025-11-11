import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

// R2クライアントの設定（VITE_プレフィックス付きとなしの両方をサポート）
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.VITE_CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY

// 起動時に環境変数を確認
console.log('🔧 R2削除API初期化:', {
  accountId: accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET',
  accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'NOT SET',
  secretAccessKey: secretAccessKey ? 'SET' : 'NOT SET',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`
})

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

    // バケット名を取得
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME

    console.log('�️ R2削除リクエスト詳細:', {
      method: req.method,
      fileKey: fileKey,
      bucket: bucketName,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET',
      accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'NOT SET',
      hasSecretKey: !!secretAccessKey
    })

    // R2から削除
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    console.log('📤 DeleteObjectCommand送信中...')
    await r2Client.send(deleteCommand)
    console.log('✅ DeleteObjectCommand送信完了')

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
    console.error('❌ R2削除エラー詳細:', {
      errorName: error.name,
      errorCode: error.Code || error.$metadata?.httpStatusCode,
      errorMessage: error.message,
      fileKey: req.body.fileKey,
      bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      requestId: error.$metadata?.requestId,
      metadata: error.$metadata
    })
    
    // ファイルが存在しない場合は成功として扱う
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      console.log('📄 ファイルが存在しないため削除完了:', req.body.fileKey)
      return res.status(200).json({
        success: true,
        message: 'ファイルは既に存在しないため削除完了',
        fileKey: req.body.fileKey
      })
    }
    
    // 権限エラーの場合
    if (error.name === 'AccessDenied' || error.Code === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      console.error('🚫 権限エラー: DeleteObject権限がない可能性があります')
      console.error('CloudflareダッシュボードでAPIトークンの権限を確認してください')
    }
    
    // 環境変数の確認
    console.error('🔍 環境変数チェック:')
    console.error('CLOUDFLARE_ACCOUNT_ID:', accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET')
    console.error('CLOUDFLARE_R2_ACCESS_KEY_ID:', accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'NOT SET')
    console.error('CLOUDFLARE_R2_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET (長さ: ' + secretAccessKey.length + ')' : 'NOT SET')
    console.error('CLOUDFLARE_R2_BUCKET_NAME:', process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME)
    
    res.status(500).json({
      error: 'ファイル削除に失敗しました',
      details: error.message,
      errorName: error.name,
      errorCode: error.Code || error.$metadata?.httpStatusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
