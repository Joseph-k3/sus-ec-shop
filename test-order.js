// テスト用：ordersテーブルへの挿入をテスト
import { supabase } from './src/lib/supabase.js'
import { getOrCreateCustomerId } from './src/lib/customerUtils.js'

async function testOrderInsertion() {
  try {
    console.log('1. テスト開始')
    
    // 顧客IDを取得
    const customerId = getOrCreateCustomerId()
    console.log('2. 顧客ID:', customerId)
    
    // テスト用の注文データ
    const testOrderData = {
      order_number: `TEST${Date.now()}`,
      customer_id: customerId,
      product_id: 1,
      product_name: 'テスト商品',
      product_image: 'test.jpg',
      price: 1000,
      quantity: 1,
      customer_name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      address: '東京都渋谷区',
      payment_method: 'bank',
      status: 'pending_payment',
      payment_due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_cart_order: true // これが問題の可能性
    }
    
    console.log('3. テストデータ作成完了')
    
    // データベースに挿入を試行
    const { data, error } = await supabase
      .from('orders')
      .insert([testOrderData])
      .select()
    
    if (error) {
      console.error('4. 挿入エラー:', error)
      
      // is_cart_orderなしで再試行
      delete testOrderData.is_cart_order
      console.log('5. is_cart_orderフィールドを削除して再試行')
      
      const { data: data2, error: error2 } = await supabase
        .from('orders')
        .insert([testOrderData])
        .select()
        
      if (error2) {
        console.error('6. 再試行も失敗:', error2)
      } else {
        console.log('7. 再試行成功:', data2)
      }
    } else {
      console.log('4. 挿入成功:', data)
    }
    
  } catch (error) {
    console.error('テスト中にエラー:', error)
  }
}

testOrderInsertion()
