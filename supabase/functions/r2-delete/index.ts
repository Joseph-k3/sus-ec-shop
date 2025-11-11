// Supabase Edge Function for R2 File Deletion
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3'

const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')
const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// R2クライアントの設定
let r2Client: S3Client | null = null

function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return r2Client
}

serve(async (req) => {
  // CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { fileKey } = await req.json()

    if (!fileKey) {
      return new Response(
        JSON.stringify({ error: 'fileKeyが必要です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 環境変数チェック
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME) {
      return new Response(
        JSON.stringify({
          error: 'R2環境変数が設定されていません',
          details: {
            accountId: !!CLOUDFLARE_ACCOUNT_ID,
            accessKeyId: !!CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: !!CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            bucketName: !!CLOUDFLARE_R2_BUCKET_NAME,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // R2から削除
    const client = getR2Client()
    const deleteCommand = new DeleteObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileKey,
    })

    await client.send(deleteCommand)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ファイルを削除しました',
        fileKey: fileKey
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    // ファイルが存在しない場合は成功として扱う
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'ファイルは既に存在しないため削除完了',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'ファイル削除に失敗しました',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
