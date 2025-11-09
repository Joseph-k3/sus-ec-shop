// Supabase Edge Function for Square Checkout API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client, Environment } from 'https://esm.sh/square@39.0.0'

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

console.log(`Square Checkout - Environment: ${SQUARE_ENVIRONMENT}`)
console.log(`Using ${IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION'} credentials`)

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

    // Initialize Square client with environment-specific settings
    console.log('🔧 Square クライアント初期化中...')
    const client = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: IS_SANDBOX ? Environment.Sandbox : Environment.Production,
    })
    console.log('✅ Square クライアント初期化完了')

    // Prepare line items for Square
    console.log('📦 商品ラインアイテム準備中...')
    console.log('📦 受信した商品データ:', JSON.stringify(orderData.items, null, 2))
    
    const lineItems = orderData.items.map((item: any, index: number) => {
      const priceInCents = Math.round(item.price * 100)
      console.log(`📦 商品[${index}]: ${item.name}`)
      console.log(`   価格: ${item.price}円 → ${priceInCents}セント`)
      
      return {
        name: item.name,
        quantity: item.quantity.toString(),
        basePriceMoney: {
          amount: BigInt(priceInCents),
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
        basePriceMoney: {
          amount: BigInt(Math.round(orderData.shippingFee * 100)),
          currency: 'JPY',
        },
      })
    }

    // Create checkout
    console.log('🔗 Square Payment Link作成中...')
    console.log('Location ID:', SQUARE_LOCATION_ID)
    console.log('Line Items:', JSON.stringify(lineItems, (_, v) => typeof v === 'bigint' ? v.toString() : v))
    
    const { result, statusCode } = await client.checkoutApi.createPaymentLink({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: SQUARE_LOCATION_ID,
        lineItems: lineItems,
        metadata: {
          customerName: orderData.customerName,
          email: orderData.email,
          phone: orderData.phone,
          postalCode: orderData.postal,
          address: orderData.address,
          notes: orderData.notes || '',
          cartOrderNumber: orderData.cartOrderNumber || '', // カート注文番号を追加
        },
      },
      checkoutOptions: {
        redirectUrl: `${orderData.redirectUrl || 'https://www.sus-ec-shop.com'}/payment-complete?order=${orderData.cartOrderNumber || ''}`,
        askForShippingAddress: true, // 住所入力欄を表示
      },
      prePopulatedData: {
        buyerEmail: orderData.email,
        buyerPhoneNumber: orderData.phone,
        buyerAddress: {
          addressLine1: orderData.addressLine1 || orderData.address || '',
          addressLine2: orderData.addressLine2 || '',
          locality: orderData.locality || '', // 市区町村
          administrativeDistrictLevel1: orderData.prefecture || '', // 都道府県
          postalCode: orderData.postal || '',
          country: 'JP',
        },
      },
    })

    console.log('📊 Square API レスポンスコード:', statusCode)
    
    if (statusCode !== 200) {
      console.error('❌ Square API エラー:', statusCode)
      console.error('❌ エラー詳細:', JSON.stringify(result, null, 2))
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout', details: result }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅✅✅ Checkout作成成功!')
    console.log('Payment Link URL:', result.paymentLink?.url)
    console.log('Order ID:', result.paymentLink?.orderId)
    console.log('Payment Link ID:', result.paymentLink?.id)

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: result.paymentLink?.url,
        orderId: result.paymentLink?.orderId,
        paymentLinkId: result.paymentLink?.id,
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