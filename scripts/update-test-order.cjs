#!/usr/bin/env node

/**
 * 既存の注文にテスト用のsquare_order_idを設定するスクリプト
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv/config')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateTestOrder() {
  console.log('🔍 最新の注文を確認中...\n')

  // 最新の注文を取得
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('❌ 注文の取得に失敗:', error)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('📦 注文が見つかりませんでした')
    return
  }

  const order = orders[0]
  console.log('最新の注文:')
  console.log(`  注文番号: ${order.order_number}`)
  console.log(`  Square注文ID: ${order.square_order_id || 'なし'}`)
  console.log(`  Square決済リンクID: ${order.square_payment_link_id || 'なし'}`)
  console.log()

  // square_order_idが設定されていない場合、テスト値を設定
  if (!order.square_order_id || !order.square_payment_link_id) {
    console.log('❓ Square IDが設定されていません。テスト値を設定しますか？ (y/n)')
    console.log('   このスクリプトはテスト用です。実際の値ではありません。')
    
    // 自動的にテスト値を設定
    const testOrderId = `TEST-ORDER-${Date.now()}`
    const testLinkId = `TEST-LINK-${Date.now()}`
    
    console.log(`\n✏️  テスト値を設定します...`)
    console.log(`   square_order_id: ${testOrderId}`)
    console.log(`   square_payment_link_id: ${testLinkId}`)

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        square_order_id: testOrderId,
        square_payment_link_id: testLinkId,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('\n❌ 更新失敗:', updateError)
      return
    }

    console.log('\n✅ テスト値を設定しました！')
    console.log('\n確認:')
    console.log(`   node scripts/check-square-payments.js`)
  } else {
    console.log('✅ Square IDは既に設定されています')
  }
}

updateTestOrder().catch(error => {
  console.error('\n❌ エラー:', error.message)
  process.exit(1)
})
