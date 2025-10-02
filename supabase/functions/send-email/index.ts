import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ServerClient } from 'https://esm.sh/postmark'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    
    const { to, subject, html_body } = requestBody

    // 必須フィールドのチェック
    if (!to || !subject || !html_body) {
      throw new Error('Missing required fields: to, subject, html_body')
    }

    // 環境変数の確認
    const apiKey = Deno.env.get('POSTMARK_API_KEY')
    const senderEmail = Deno.env.get('SENDER_EMAIL')
    
      hasApiKey: !!apiKey,
      hasSenderEmail: !!senderEmail,
      senderEmail
    })

    if (!apiKey || !senderEmail) {
      throw new Error('Missing environment variables: POSTMARK_API_KEY or SENDER_EMAIL')
    }

    // Postmarkクライアントの初期化
    const postmark = new ServerClient(apiKey)

      to, 
      subject: subject.substring(0, 50),
      recipientType: to.includes('ryosk8er1026@yahoo.co.jp') ? '管理者' : '購入者'
    })

    // メール送信
    const response = await postmark.sendEmail({
      From: senderEmail,
      To: to,
      Subject: subject,
      HtmlBody: html_body,
    })


    return new Response(
      JSON.stringify({ success: true, response }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  } catch (error) {
    console.error('メール送信エラー:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: error.toString()
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  }
})
