// Supabase Edge Function for Square Refund
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client, Environment } from 'https://esm.sh/square@35.0.0'

// 環境変数から設定を取得
const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'
const IS_SANDBOX = SQUARE_ENVIRONMENT === 'sandbox'

const SQUARE_ACCESS_TOKEN = IS_SANDBOX 
  ? Deno.env.get('SQUARE_SANDBOX_ACCESS_TOKEN') || Deno.env.get('SQUARE_ACCESS_TOKEN')
  : Deno.env.get('SQUARE_ACCESS_TOKEN')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

console.log(`Square Refund - Environment: ${SQUARE_ENVIRONMENT}`)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, reason } = await req.json()

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing refund for order: ${orderId}`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      console.error('Failed to fetch order:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Order not found', details: fetchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order is already refunded
    if (order.refunded || order.status === 'refunded') {
      return new Response(
        JSON.stringify({ error: 'Order is already refunded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order has a payment ID
    if (!order.square_payment_id) {
      return new Response(
        JSON.stringify({ error: 'No payment ID found for this order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if this is a test payment ID (for development/testing)
    const isTestPayment = order.square_payment_id.startsWith('TEST_')
    
    let result: any
    let statusCode = 200

    if (isTestPayment) {
      // Mock refund for test environment
      console.log(`⚠️ TEST MODE: Mocking refund for payment: ${order.square_payment_id}`)
      result = {
        refund: {
          id: `TEST_REFUND_${crypto.randomUUID()}`,
          status: 'COMPLETED',
          amount_money: {
            amount: Math.round((order.price * order.quantity) * 100),
            currency: 'JPY'
          },
          payment_id: order.square_payment_id,
          created_at: new Date().toISOString()
        }
      }
      statusCode = 200
    } else {
      // Real Square API refund
      const client = new Client({
        accessToken: SQUARE_ACCESS_TOKEN,
        environment: IS_SANDBOX ? Environment.Sandbox : Environment.Production,
      })

      // Calculate refund amount in cents
      const refundAmountMoney = {
        amount: BigInt(Math.round((order.price * order.quantity) * 100)), // Convert to cents
        currency: 'JPY',
      }

      console.log(`Refunding payment: ${order.square_payment_id}, amount: ${refundAmountMoney.amount}`)

      // Create refund
      const apiResponse = await client.refundsApi.refundPayment({
        idempotencyKey: crypto.randomUUID(),
        paymentId: order.square_payment_id,
        amountMoney: refundAmountMoney,
        reason: reason || '注文重複・管理者による返金処理',
      })

      result = apiResponse.result
      statusCode = apiResponse.statusCode
    }

    if (statusCode !== 200) {
      console.error('Square refund error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to process refund', details: result }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Refund created successfully:', result.refund)

    // Update order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        refunded: true,
        refund_id: result.refund?.id,
        refund_reason: reason || '注文重複・管理者による返金処理',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
      // Note: Refund was successful but DB update failed
      // This should be handled manually
    }

    // Restore product stock
    try {
      const { error: stockError } = await supabase
        .from('succulents')
        .update({
          quantity: supabase.raw(`quantity + ${order.quantity}`),
        })
        .eq('id', order.product_id)

      if (stockError) {
        console.error('Failed to restore stock:', stockError)
      }
    } catch (stockErr) {
      console.error('Stock restoration error:', stockErr)
    }

    // Send notification email to admin
    try {
      await supabase.functions.invoke('send-email-mailgun', {
        body: {
          to: 'ryosk8er1026@yahoo.co.jp',
          subject: `【返金完了】${order.customer_name}様の注文 (${order.order_number})`,
          html: `
            <h2>返金処理が完了しました</h2>
            
            <h3>注文情報</h3>
            <p><strong>注文番号:</strong> ${order.order_number}</p>
            <p><strong>返金ID:</strong> ${result.refund?.id}</p>
            <p><strong>商品名:</strong> ${order.product_name}</p>
            <p><strong>数量:</strong> ${order.quantity}個</p>
            <p><strong>返金額:</strong> ¥${(order.price * order.quantity).toLocaleString()}</p>
            
            <h3>お客様情報</h3>
            <p><strong>お名前:</strong> ${order.customer_name}</p>
            <p><strong>メール:</strong> ${order.email}</p>
            
            <h3>返金理由</h3>
            <p>${reason || '注文重複・管理者による返金処理'}</p>
            
            <div style="background-color: #fff3cd; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ 返金処理完了</strong><br>
                在庫数が復元されました。お客様への連絡をお願いします。
              </p>
            </div>
            
            <hr>
            <p>管理画面: <a href="https://www.sus-ec-shop.com/admin/orders">注文管理</a></p>
          `,
        },
      })
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError)
    }

    // Send notification email to customer
    try {
      await supabase.functions.invoke('send-email-mailgun', {
        body: {
          to: order.email,
          subject: '【SUS Plants EC Shop】ご注文の返金処理について',
          html: `
            <h2>返金処理のお知らせ</h2>
            <p>${order.customer_name} 様</p>
            
            <p>ご注文の返金処理が完了いたしました。</p>
            
            <h3>返金内容</h3>
            <p><strong>注文番号:</strong> ${order.order_number}</p>
            <p><strong>商品名:</strong> ${order.product_name}</p>
            <p><strong>返金額:</strong> ¥${(order.price * order.quantity).toLocaleString()}</p>
            
            <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
              <p style="color: #2e7d32; margin: 0;">
                <strong>返金処理完了</strong><br>
                ご利用のお支払い方法に返金されます。<br>
                返金の反映までには数日かかる場合がございます。
              </p>
            </div>
            
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            
            <hr>
            <p>SUS Plants EC Shop</p>
            <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
          `,
        },
      })
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError)
    }

    console.log('Refund processing completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        refundId: result.refund?.id,
        orderId: orderId,
        amount: order.price * order.quantity,
        environment: SQUARE_ENVIRONMENT,
        isTest: IS_SANDBOX,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Refund processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        environment: SQUARE_ENVIRONMENT,
        isTest: IS_SANDBOX,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
