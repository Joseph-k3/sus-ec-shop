/**
 * Cloudflare R2署名付きURL生成API (Vercel Serverless Function)
 * 
 * 4MB以上の大容量ファイルをアップロードする際、Vercelのペイロード制限を回避するため、
 * 署名付きURLを生成してクライアントから直接R2にアップロードする方式を提供します。
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// R2設定
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'sus-ec-images'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

// R2クライアント初期化
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'このエンドポイントはPOSTメソッドのみ対応しています'
    })
  }

  try {
    console.log('📝 署名付きURL生成リクエスト受信:', {
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer ***' : 'なし'
      }
    })

    // 環境変数チェック
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error('❌ R2環境変数が設定されていません')
      return res.status(500).json({
        error: 'Server Configuration Error',
        message: 'R2の環境変数が設定されていません'
      })
    }

    const { filename, contentType } = req.body

    // バリデーション
    if (!filename) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'filenameは必須です'
      })
    }

    if (!contentType) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'contentTypeは必須です'
      })
    }

    // ファイル名の生成
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExtension = filename.split('.').pop()
    const key = `products/videos/video_${timestamp}_${randomId}.${fileExtension}`

    console.log('🔑 R2オブジェクトキー:', key)

    // 署名付きURLを生成（有効期限: 1時間）
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1時間
    })

    console.log('✅ 署名付きURL生成成功')

    // 公開URLを構築
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`

    return res.status(200).json({
      signedUrl,
      publicUrl,
      key,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('❌ 署名付きURL生成エラー:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '署名付きURLの生成に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
