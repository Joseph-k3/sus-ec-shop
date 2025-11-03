// Supabase Edge Function for Square Checkout API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client, Environment } from 'https://esm.sh/square@35.0.0'

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
    const { orderData } = await req.json()

    // Validate required fields
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Order data with items is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing order in ${SQUARE_ENVIRONMENT} mode`)

    // Initialize Square client with environment-specific settings
    const client = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: IS_SANDBOX ? Environment.Sandbox : Environment.Production,
    })

    // Prepare line items for Square
    const lineItems = orderData.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)), // Convert to cents
        currency: 'JPY',
      },
    }))

    // Add shipping as a line item if exists
    if (orderData.shippingFee && orderData.shippingFee > 0) {
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

    if (statusCode !== 200) {
      console.error('Square API error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout', details: result }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checkout created successfully:', result.paymentLink)

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
    console.error('Error creating checkout:', error)
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
