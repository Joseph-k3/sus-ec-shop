import { supabase } from './supabase'

/**
 * Square Checkoutセッションを作成
 * @param {Object} orderData - 注文データ
 * @returns {Promise<Object>} - Checkout URL等
 */
export async function createSquareCheckout(orderData) {
  try {
    const { data, error } = await supabase.functions.invoke('square-checkout', {
      body: { orderData }
    })

    if (error) {
      throw new Error(error.message || 'Square Checkout作成に失敗しました')
    }

    return data
  } catch (error) {
    console.error('Square checkout error:', error)
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
    for (const item of items) {
      const { data: product, error } = await supabase
        .from('succulents')
        .select('quantity, name')
        .eq('id', item.id)
        .single()

      if (error) throw error

      if (!product || product.quantity < item.quantity) {
        throw new Error(
          `商品「${item.name}」の在庫が不足しています（在庫: ${product?.quantity || 0}個、必要: ${item.quantity}個）`
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
