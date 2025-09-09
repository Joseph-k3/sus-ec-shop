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
    const { to, subject, html_body } = await req.json()

    // Postmarkクライアントの初期化
    const postmark = new ServerClient(Deno.env.get('POSTMARK_API_KEY'))

    // メール送信
    const response = await postmark.sendEmail({
      From: Deno.env.get('SENDER_EMAIL'),
      To: to,
      Subject: subject,
      HtmlBody: html_body,
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
