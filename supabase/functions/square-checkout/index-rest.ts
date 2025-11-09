// Supabase Edge Function for Square Checkout API (REST API版)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// 環境変数から設定を取得（サンドボックス/本番を切り替え）
const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'
const IS_SANDBOX = SQUARE_ENVIRONMENT === 'sandbox'

// サンドボックスまたは本番環境の認証情報を使用
const SQUARE_ACCESS_TOKEN = IS_SANDBOX 
  ? Deno.env.get('SQUARE_SANDBOX_ACCESS_TOKEN') || Deno.env.get('SQUARE_ACCESS_TOKEN')
  : Deno.env.get('SQUARE_ACCESS_TOKEN')

const SQUARE_LOCATION_ID = IS_SANDBOX
  ? Deno.env.get('SQUARE_SANDBOX_LOCATION_ID') || Deno.env.get('SQUARE_LOCATION_ID')
  : Deno.env.get('SQUARE_LOCATION_ID')

// Square APIのベースURL
const SQUARE_API_BASE = IS_SANDBOX 
  ? 'https://connect.squareupsandbox.com' 
  : 'https://connect.squareup.com'

console.log(`Square Checkout - Environment: ${SQUARE_ENVIRONMENT}`)
console.log(`Square API Base: ${SQUARE_API_BASE}`)

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
    console.log('🎯 Square Checkout リクエスト受信')
    console.log('Environment:', SQUARE_ENVIRONMENT)
    console.log('Access Token exists:', !!SQUARE_ACCESS_TOKEN)
    console.log('Location ID exists:', !!SQUARE_LOCATION_ID)
    
    if (!SQUARE_ACCESS_TOKEN) {
      console.error('❌ SQUARE_ACCESS_TOKEN が設定されていません')
      return new Response(
        JSON.stringify({ error: 'Square credentials not configured', details: 'SQUARE_ACCESS_TOKEN is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!SQUARE_LOCATION_ID) {
      console.error('❌ SQUARE_LOCATION_ID が設定されていません')
      return new Response(
        JSON.stringify({ error: 'Square credentials not configured', details: 'SQUARE_LOCATION_ID is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { orderData } = await req.json()
    console.log('📦 注文データ受信:', JSON.stringify(orderData, null, 2))

    // Validate required fields
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Order data with items is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing order in ${SQUARE_ENVIRONMENT} mode`)

    // Prepare line items for Square
    console.log('📦 商品ラインアイテム準備中...')
    console.log('📦 受信した商品データ:', JSON.stringify(orderData.items, null, 2))
    
    const lineItems = orderData.items.map((item: any, index: number) => {
      const priceInCents = Math.round(item.price)
      console.log(`📦 商品[${index}]: ${item.name}`)
      console.log(`   価格: ${item.price}円 → ${priceInCents}円`)
      
      return {
        name: item.name,
        quantity: item.quantity.toString(),
        base_price_money: {
          amount: priceInCents,
          currency: 'JPY',
        },
      }
    })
    console.log('✅ 商品ラインアイテム準備完了:', lineItems.length, '件')

    // Add shipping as a line item if exists
    if (orderData.shippingFee && orderData.shippingFee > 0) {
      console.log('📦 送料を追加:', orderData.shippingFee, '円')
      lineItems.push({
        name: `送料 (${orderData.shippingRegion || '配送地域'})`,
        quantity: '1',
        base_price_money: {
          amount: Math.round(orderData.shippingFee),
          currency: 'JPY',
        },
      })
    }

    // Square Payment Link作成のリクエストボディ
    const requestBody = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: lineItems,
        metadata: {
          customer_name: orderData.customerName || '',
          email: orderData.email || '',
          phone: orderData.phone || '',
          postal_code: orderData.postal || '',
          address: orderData.address || '',
          notes: orderData.notes || '',
          cart_order_number: orderData.cartOrderNumber || '',
        },
      },
      checkout_options: {
        redirect_url: `${orderData.redirectUrl || 'https://www.sus-ec-shop.com'}/payment-complete?order=${orderData.cartOrderNumber || ''}`,
        ask_for_shipping_address: true,
      },
      pre_populated_data: {
        buyer_email: orderData.email || '',
        buyer_phone_number: orderData.phone || '',
        buyer_address: {
          address_line_1: orderData.address || '',
          postal_code: orderData.postal || '',
          country: 'JP',
        },
      },
    }

    console.log('🔗 Square Payment Link作成中...')
    console.log('Location ID:', SQUARE_LOCATION_ID)
    console.log('Request Body:', JSON.stringify(requestBody, null, 2))

    // Square REST APIを直接呼び出し
    const response = await fetch(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-11-20',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()
    console.log('📊 Square API レスポンスコード:', response.status)
    console.log('📊 Square API レスポンス:', JSON.stringify(result, null, 2))

    if (!response.ok) {
      console.error('❌ Square API エラー:', response.status)
      console.error('❌ エラー詳細:', JSON.stringify(result, null, 2))
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅✅✅ Checkout作成成功!')
    console.log('Payment Link URL:', result.payment_link?.url)
    console.log('Order ID:', result.payment_link?.order_id)
    console.log('Payment Link ID:', result.payment_link?.id)

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: result.payment_link?.url,
        orderId: result.payment_link?.order_id,
        paymentLinkId: result.payment_link?.id,
        environment: SQUARE_ENVIRONMENT,
        isTest: IS_SANDBOX,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌❌❌ ============================================')
    console.error('❌ Square Checkout作成エラー')
    console.error('❌❌❌ ============================================')
    console.error('🚨 エラー詳細:', error)
    console.error('📋 エラーメッセージ:', error.message)
    console.error('📋 エラースタック:', error.stack)
    console.error('📋 Environment:', SQUARE_ENVIRONMENT)
    console.error('📋 Access Token exists:', !!SQUARE_ACCESS_TOKEN)
    console.error('📋 Location ID exists:', !!SQUARE_LOCATION_ID)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        details: error.toString(),
        environment: SQUARE_ENVIRONMENT,
        isTest: IS_SANDBOX,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
