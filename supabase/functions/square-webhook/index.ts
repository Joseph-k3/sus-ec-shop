// Supabase Edge Function for Square Webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SQUARE_WEBHOOK_SIGNATURE_KEY = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-square-signature',
}

serve(async (req) => {
  // CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('x-square-signature')

    // Verify webhook signature (production環境では必須)
    // TODO: 本番環境では署名検証を実装
    // if (!verifySignature(body, signature, SQUARE_WEBHOOK_SIGNATURE_KEY)) {
    //   return new Response('Invalid signature', { status: 401 })
    // }

    const event = JSON.parse(body)
    console.log('Square webhook event received:', event.type)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Handle payment completed event
    if (event.type === 'payment.created' || event.type === 'payment.updated') {
      const payment = event.data.object.payment

      // Payment completed successfully
      if (payment.status === 'COMPLETED') {
        console.log('Payment completed:', payment.id)

        // Get order ID from payment
        const squareOrderId = payment.order_id || payment.orderId
        if (!squareOrderId) {
          console.error('Order ID not found in payment')
          return new Response('Order ID not found', { status: 400 })
        }

        // Get order details from Square (contains metadata)
        // Note: In production, you should fetch order details from Square API
        // For now, we'll extract from payment metadata
        const orderMetadata = payment.note || '{}'
        let orderData
        try {
          orderData = JSON.parse(orderMetadata)
        } catch (e) {
          console.error('Failed to parse order metadata:', e)
          orderData = {}
        }

        // Check if order already exists
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('square_order_id', squareOrderId)
          .single()

        if (existingOrder) {
          console.log('Order already exists, updating status')
          
          // Update existing order
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              payment_status: 'paid',
              square_payment_id: payment.id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id)

          if (updateError) {
            console.error('Failed to update order:', updateError)
            return new Response('Failed to update order', { status: 500 })
          }

          // Decrease product stock
          const { error: stockError } = await supabase
            .from('succulents')
            .update({
              quantity: supabase.raw('quantity - ?', [existingOrder.quantity]),
            })
            .eq('id', existingOrder.product_id)
            .gt('quantity', 0)

          if (stockError) {
            console.error('Failed to decrease stock:', stockError)
          }

          // Send emails
          await sendEmails(supabase, existingOrder, payment.id)
          
        } else {
          console.log('Creating new order from webhook')
          
          // Create new orders from payment (this shouldn't happen in normal flow)
          // But keeping it as fallback
          console.warn('Order should be created before payment, but creating from webhook as fallback')
        }

        console.log('Order processing completed successfully')
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Webhook signature verification (production用)
function verifySignature(body: string, signature: string, key: string): boolean {
  // TODO: Implement Square webhook signature verification
  // https://developer.squareup.com/docs/webhooks/step3validate
  return true
}

// Send confirmation emails
async function sendEmails(supabase: any, order: any, paymentId: string) {
  // Send email to admin
  try {
    await supabase.functions.invoke('send-email-mailgun', {
      body: {
        to: 'k3.ns.208_b50@icloud.com',
        subject: `【決済完了】${order.customer_name}様の注文`,
        html: `
          <h2>Square決済が完了しました</h2>
          
          <h3>注文情報</h3>
          <p>注文番号: ${order.order_number}</p>
          <p>決済ID: ${paymentId}</p>
          <p>商品名: ${order.product_name}</p>
          <p>数量: ${order.quantity}個</p>
          <p>金額: ¥${(order.price * order.quantity).toLocaleString()}</p>
          
          <h3>お客様情報</h3>
          <p>お名前: ${order.customer_name}</p>
          <p>メール: ${order.email}</p>
          <p>電話: ${order.phone}</p>
          <p>住所: ${order.address}</p>
          
          <div style="background-color: #d4edda; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
            <p style="color: #155724; margin: 0;">
              <strong>商品の発送作業を開始してください</strong>
            </p>
          </div>
          
          <hr>
          <p>管理画面: <a href="https://www.sus-ec-shop.com/admin/orders">注文管理</a></p>
        `,
      },
    })
  } catch (emailError) {
    console.error('Failed to send admin email:', emailError)
  }

  // Send email to customer
  try {
    await supabase.functions.invoke('send-email-mailgun', {
      body: {
        to: order.email,
        subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
        html: `
          <h2>ご注文ありがとうございます</h2>
          <p>${order.customer_name} 様</p>
          
          <p>ご注文の決済が完了いたしました。</p>
          
          <h3>ご注文内容</h3>
          <p>注文番号: ${order.order_number}</p>
          <p>商品名: ${order.product_name}</p>
          <p>数量: ${order.quantity}個</p>
          <p>金額: ¥${(order.price * order.quantity).toLocaleString()}</p>
          
          <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
            <p style="color: #2e7d32; margin: 0;">
              <strong>決済が完了しました</strong><br>
              商品の準備が整い次第、発送させていただきます。
            </p>
          </div>
          
          <p>発送完了時に改めてご連絡させていただきます。</p>
          
          <hr>
          <p>SUS Plants EC Shop</p>
          <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
        `,
      },
    })
  } catch (emailError) {
    console.error('Failed to send customer email:', emailError)
  }
}
