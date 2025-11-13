import { supabase } from './supabase'

/**
 * Square Checkoutセッションを作成
 * @param {Object} orderData - 注文データ
 * @returns {Promise<Object>} - Checkout URL等
 */
export async function createSquareCheckout(orderData) {
  try {
    console.log('🔗 Supabase Edge Function呼び出し中...')
    console.log('📦 送信データ:', JSON.stringify(orderData, null, 2))
    
    const { data, error } = await supabase.functions.invoke('square-checkout', {
      body: { orderData }
    })

    console.log('📊 Edge Function レスポンス:', { data, error })

    if (error) {
      console.error('❌ Edge Function エラー:', error)
      console.error('❌ エラー詳細:', JSON.stringify(error, null, 2))
      throw new Error(error.message || 'Square Checkout作成に失敗しました')
    }

    if (!data) {
      console.error('❌ Edge Function からデータが返されませんでした')
      throw new Error('Edge Functionからデータが返されませんでした')
    }

    console.log('✅ Edge Function 成功:', data)
    return data
  } catch (error) {
    console.error('❌❌❌ Square checkout error:', error)
    console.error('📋 エラーメッセージ:', error.message)
    console.error('📋 エラースタック:', error.stack)
    throw error
  }
}

/**
 * 注文をデータベースに保存（Square決済前）
 * @param {Object} orderInfo - 注文情報
 * @returns {Promise<Object>} - 保存された注文データ
 */
export async function saveOrderToDatabase(orderInfo) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderInfo])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Database save error:', error)
    throw error
  }
}

/**
 * カート注文用の一括保存（複数商品）
 * @param {Array} orders - 注文データの配列
 * @returns {Promise<Array>} - 保存された注文データの配列
 */
export async function saveCartOrders(orders) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orders)
      .select()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Cart orders save error:', error)
    throw error
  }
}

/**
 * 商品の在庫確認
 * @param {Array} items - カート内の商品
 * @returns {Promise<Boolean>} - 在庫が十分かどうか
 */
export async function checkProductStock(items) {
  try {
    // 商品IDごとに合計数量を集計
    const itemTotals = {}
    for (const item of items) {
      if (!itemTotals[item.id]) {
        itemTotals[item.id] = 0
      }
      itemTotals[item.id] += item.quantity
    }
    // 各商品について在庫チェック
    for (const id in itemTotals) {
      const { data: product, error } = await supabase
        .from('succulents')
        .select('quantity, name')
        .eq('id', id)
        .single()

      if (error) throw error

      if (!product || itemTotals[id] > product.quantity) {
        throw new Error(
          `商品「${product?.name || id}」の在庫が不足しています（在庫: ${product?.quantity || 0}個、必要: ${itemTotals[id]}個）`
        )
      }
    }

    return true
  } catch (error) {
    console.error('Stock check error:', error)
    throw error
  }
}

/**
 * 注文番号を生成
 * @param {String} prefix - プレフィックス（例: 'CART', 'SINGLE'）
 * @returns {String} - 生成された注文番号
 */
export function generateOrderNumber(prefix = 'ORDER') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

/**
 * 支払期限を計算（48時間後）
 * @returns {String} - ISO形式の日時
 */
export function calculatePaymentDueDate(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}
