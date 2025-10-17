import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const form = formidable({
      multiples: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB
    })

    const [fields, files] = await form.parse(req)
    const file = files.file?.[0]
    const type = fields.type?.[0] || 'image'
    const productId = fields.productId?.[0] || 'general'

    if (!file) {
      return res.status(400).json({ error: 'ファイルが選択されていません' })
    }

    // ファイル拡張子をチェック
    const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const allowedVideoTypes = ['.mp4', '.webm', '.ogg', '.mov']
    const fileExt = path.extname(file.originalFilename).toLowerCase()

    if (type === 'image' && !allowedImageTypes.includes(fileExt)) {
      return res.status(400).json({ error: '対応していない画像形式です' })
    }

    if (type === 'video' && !allowedVideoTypes.includes(fileExt)) {
      return res.status(400).json({ error: '対応していない動画形式です' })
    }

    // 現在の年月を取得
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // ファイル名を生成（年月ベース + タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const typeFolder = type === 'video' ? 'videos' : 'images'
    const fileName = `products/${year}/${month}/${typeFolder}/${timestamp}-${randomStr}${fileExt}`

    // ファイルを読み込み
    const fileBuffer = fs.readFileSync(file.filepath)

    // MIME typeを設定
    let contentType = 'application/octet-stream'
    if (type === 'image') {
      if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg'
      else if (fileExt === '.png') contentType = 'image/png'
      else if (fileExt === '.gif') contentType = 'image/gif'
      else if (fileExt === '.webp') contentType = 'image/webp'
    } else if (type === 'video') {
      if (fileExt === '.mp4') contentType = 'video/mp4'
      else if (fileExt === '.webm') contentType = 'video/webm'
      else if (fileExt === '.ogg') contentType = 'video/ogg'
      else if (fileExt === '.mov') contentType = 'video/quicktime'
    }

    // バケット名と公開URLを取得
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME
    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL

    // R2にアップロード
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    })

    await r2Client.send(uploadCommand)

    // 公開URLを生成
    const publicUrl = `${publicBaseUrl}${fileName}`

    // 一時ファイルを削除
    fs.unlinkSync(file.filepath)

    res.status(200).json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      type: type
    })

  } catch (error) {
    console.error('R2 upload error:', error)
    
    // 環境変数の確認
    console.error('Environment variables check:')
    console.error('CLOUDFLARE_ACCOUNT_ID:', accountId ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'NOT SET')
    console.error('CLOUDFLARE_R2_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'NOT SET')
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.VITE_CLOUDFLARE_R2_BUCKET_NAME
    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL
    console.error('CLOUDFLARE_R2_BUCKET_NAME:', bucketName)
    console.error('CLOUDFLARE_R2_PUBLIC_URL:', publicBaseUrl)
    
    res.status(500).json({
      error: 'アップロードに失敗しました',
      details: error.message,
      stack: error.stack
    })
  }
}
