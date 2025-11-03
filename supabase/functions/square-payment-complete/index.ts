// Supabase Edge Function for Square Payment Completion
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
    const { cartOrderNumber, squareOrderId, paymentLinkId } = await req.json()

    if (!cartOrderNumber) {
      return new Response(
        JSON.stringify({ error: 'Cart order number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing payment completion for order:', cartOrderNumber)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get all orders with this cart order number
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_number', `${cartOrderNumber}%`)

    if (fetchError) {
      console.error('Failed to fetch orders:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!orders || orders.length === 0) {
      console.error('No orders found for:', cartOrderNumber)
      return new Response(
        JSON.stringify({ error: 'Orders not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${orders.length} orders to process`)

    // Update all orders
    const updatePromises = orders.map(async (order) => {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          square_order_id: squareOrderId,
          square_payment_link_id: paymentLinkId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (updateError) {
        console.error(`Failed to update order ${order.id}:`, updateError)
        throw updateError
      }

      // Decrease product stock
      const { error: stockError } = await supabase.rpc('decrease_product_stock', {
        product_id: order.product_id,
        quantity_to_decrease: order.quantity,
      })

      if (stockError) {
        console.error(`Failed to decrease stock for product ${order.product_id}:`, stockError)
        // Don't throw error, just log it
      }

      return order
    })

    await Promise.all(updatePromises)

    // Send confirmation emails
    const firstOrder = orders[0]
    const totalAmount = orders.reduce((sum, order) => sum + (order.price * order.quantity), 0)

    // Send email to admin
    try {
      await supabase.functions.invoke('send-email-mailgun', {
        body: {
          to: 'k3.ns.208_b50@icloud.com',
          subject: `【決済完了】${firstOrder.customer_name}様の注文 (${cartOrderNumber})`,
          html: generateAdminEmail(orders, firstOrder, cartOrderNumber, totalAmount),
        },
      })
    } catch (emailError) {
      console.error('Failed to send admin email:', emailError)
    }

    // Send email to customer
    try {
      await supabase.functions.invoke('send-email-mailgun', {
        body: {
          to: firstOrder.email,
          subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
          html: generateCustomerEmail(orders, firstOrder, cartOrderNumber, totalAmount),
        },
      })
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError)
    }

    console.log('Payment completion processed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        ordersUpdated: orders.length,
        cartOrderNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Payment completion error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateAdminEmail(orders: any[], firstOrder: any, cartOrderNumber: string, totalAmount: number): string {
  const itemsList = orders.map(order => 
    `<li>${order.product_name} × ${order.quantity}個 - ¥${(order.price * order.quantity).toLocaleString()}</li>`
  ).join('')

  return `
    <h2>Square決済が完了しました</h2>
    
    <h3>注文情報</h3>
    <p><strong>カート注文番号:</strong> ${cartOrderNumber}</p>
    <p><strong>注文日時:</strong> ${new Date(firstOrder.created_at).toLocaleString('ja-JP')}</p>
    
    <h3>商品</h3>
    <ul>
      ${itemsList}
    </ul>
    <p><strong>合計金額:</strong> ¥${totalAmount.toLocaleString()}</p>
    
    <h3>お客様情報</h3>
    <p><strong>お名前:</strong> ${firstOrder.customer_name}</p>
    <p><strong>メール:</strong> ${firstOrder.email}</p>
    <p><strong>電話:</strong> ${firstOrder.phone}</p>
    <p><strong>住所:</strong> ${firstOrder.address?.replace(/\n/g, '<br>') || 'N/A'}</p>
    ${firstOrder.notes ? `<p><strong>備考:</strong> ${firstOrder.notes}</p>` : ''}
    
    <div style="background-color: #d4edda; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
      <p style="color: #155724; margin: 0;">
        <strong>✅ 決済完了</strong><br>
        商品の発送作業を開始してください
      </p>
    </div>
    
    <hr>
    <p>管理画面: <a href="https://www.sus-ec-shop.com/admin/orders">注文管理</a></p>
  `
}

function generateCustomerEmail(orders: any[], firstOrder: any, cartOrderNumber: string, totalAmount: number): string {
  const itemsList = orders.map(order => 
    `<li>${order.product_name} × ${order.quantity}個 - ¥${(order.price * order.quantity).toLocaleString()}</li>`
  ).join('')

  return `
    <h2>ご注文ありがとうございます</h2>
    <p>${firstOrder.customer_name} 様</p>
    
    <p>ご注文の決済が完了いたしました。</p>
    
    <h3>ご注文内容</h3>
    <p><strong>注文番号:</strong> ${cartOrderNumber}</p>
    <p><strong>注文日時:</strong> ${new Date(firstOrder.created_at).toLocaleString('ja-JP')}</p>
    
    <ul>
      ${itemsList}
    </ul>
    <p><strong>合計金額:</strong> ¥${totalAmount.toLocaleString()}</p>
    
    <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
      <p style="color: #2e7d32; margin: 0;">
        <strong>✅ 決済が完了しました</strong><br>
        商品の準備が整い次第、発送させていただきます。
      </p>
    </div>
    
    <p>発送完了時に改めてご連絡させていただきます。</p>
    
    <h3>お届け先</h3>
    <p>${firstOrder.address?.replace(/\n/g, '<br>') || 'N/A'}</p>
    
    <hr>
    <p>SUS Plants EC Shop</p>
    <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
  `
}
