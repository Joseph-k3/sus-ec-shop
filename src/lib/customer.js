import { v4 as uuidv4 } from 'uuid'

/**
 * 購入者IDの取得（なければ生成）
 * @returns {string} 購入者ID
 */
export const getOrCreateCustomerId = () => {
  const storageKey = 'customer_id'
  let customerId = localStorage.getItem(storageKey)
  
  if (!customerId) {
    customerId = uuidv4()
    localStorage.setItem(storageKey, customerId)
  }
  
  return customerId
}

/**
 * 購入者の注文一覧を取得
 * @param {object} supabase - Supabaseクライアントインスタンス
 * @param {string} customerId - 購入者ID
 * @returns {Promise<Array>} 注文一覧
 */
export const fetchCustomerOrders = async (supabase, customerId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      succulents (
        name,
        image_path,
        price
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 購入者による入金確認を更新
 * @param {object} supabase - Supabaseクライアントインスタンス
 * @param {number} orderId - 注文ID
 * @returns {Promise<void>}
 */
export const confirmPaymentByCustomer = async (supabase, orderId) => {
  const { error } = await supabase
    .from('orders')
    .update({
      payment_confirmed_by_customer: true,
      payment_confirmed_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) throw error
}
