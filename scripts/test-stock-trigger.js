// テスト用：在庫3個の商品に3個の注文を作成してトリガーの動作を確認
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定')
  console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定')
  console.log('VITE_SUPABASE_KEY:', process.env.VITE_SUPABASE_KEY ? '設定済み' : '未設定')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStockTrigger() {
  try {
    console.log('🧪 トリガーテスト開始\n')
    
    // 1. 商品情報を取得
    const { data: products, error: fetchError } = await supabase
      .from('succulents')
      .select('*')
      .limit(1)
      .single()
    
    if (fetchError) {
      console.error('❌ 商品取得エラー:', fetchError)
      return
    }
    
    console.log('📦 テスト対象商品:')
    console.log(`   ID: ${products.id}`)
    console.log(`   名前: ${products.name}`)
    console.log(`   在庫: ${products.quantity}個`)
    console.log(`   取引中: ${products.is_reserved}`)
    console.log()
    
    // 2. 在庫が3個であることを確認
    if (products.quantity !== 3) {
      console.log(`⚠️  在庫が3個ではありません（現在: ${products.quantity}個）`)
      console.log('   在庫を3個にリセットします...')
      
      const { error: resetError } = await supabase
        .from('succulents')
        .update({ quantity: 3, is_reserved: false })
        .eq('id', products.id)
      
      if (resetError) {
        console.error('❌ 在庫リセットエラー:', resetError)
        return
      }
      
      console.log('✅ 在庫を3個にリセットしました\n')
    }
    
    // 3. テスト注文データを作成
    const testOrderData = {
      order_number: `TEST_${Date.now()}`,
      customer_id: '00000000-0000-0000-0000-000000000000', // テスト用UUID
      product_id: products.id,
      product_name: products.name,
      product_image: products.image || '',
      price: products.price,
      quantity: 3, // 在庫と同じ数量
      customer_name: 'テストユーザー',
      email: 'test@example.com',
      phone: '090-0000-0000',
      address: '東京都テスト区テスト町1-1-1',
      payment_method: 'bank_transfer',
      status: 'pending_payment',
      payment_due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📝 テスト注文データ:')
    console.log(`   商品ID: ${testOrderData.product_id}`)
    console.log(`   数量: ${testOrderData.quantity}個`)
    console.log(`   支払い方法: ${testOrderData.payment_method}`)
    console.log()
    
    // 4. 注文を作成（トリガーが実行される）
    console.log('🔄 注文を作成中...')
    console.log('   ※ トリガーが実行されます')
    console.log()
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([testOrderData])
      .select()
    
    if (orderError) {
      console.error('❌ 注文作成エラー:', {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint
      })
      console.log()
      console.log('🔍 エラー詳細:')
      console.log(JSON.stringify(orderError, null, 2))
      return
    }
    
    console.log('✅ 注文作成成功!')
    console.log(`   注文ID: ${orderData[0].id}`)
    console.log(`   注文番号: ${orderData[0].order_number}`)
    console.log()
    
    // 5. 注文後の在庫を確認
    const { data: productsAfter, error: fetchAfterError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', products.id)
      .single()
    
    if (fetchAfterError) {
      console.error('❌ 注文後の在庫取得エラー:', fetchAfterError)
      return
    }
    
    console.log('📦 注文後の在庫:')
    console.log(`   注文前: ${products.quantity}個`)
    console.log(`   注文数: ${testOrderData.quantity}個`)
    console.log(`   注文後: ${productsAfter.quantity}個`)
    console.log(`   期待値: ${products.quantity - testOrderData.quantity}個`)
    console.log()
    
    if (productsAfter.quantity === products.quantity - testOrderData.quantity) {
      console.log('✅ トリガーが正常に動作しました!')
      console.log('   在庫が正しく減少しています')
    } else {
      console.log('⚠️  在庫が期待値と一致しません')
    }
    console.log()
    
    // 6. テスト注文をキャンセル（在庫を復元）
    console.log('🧹 テストデータをクリーンアップ中...')
    
    const { error: cancelError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderData[0].id)
    
    if (cancelError) {
      console.error('❌ 注文キャンセルエラー:', cancelError)
    }
    
    // 在庫を元に戻す
    const { error: restoreError } = await supabase
      .from('succulents')
      .update({ quantity: products.quantity })
      .eq('id', products.id)
    
    if (restoreError) {
      console.error('❌ 在庫復元エラー:', restoreError)
    } else {
      console.log('✅ 在庫を元に戻しました')
    }
    
    console.log()
    console.log('🎉 テスト完了!')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

testStockTrigger()
