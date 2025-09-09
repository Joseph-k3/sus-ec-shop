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
 * 購入者IDの存在確認
 * @returns {boolean} 購入者IDが存在すればtrue
 */
export const hasCustomerId = () => {
  return !!localStorage.getItem('customer_id')
}

/**
 * 購入者IDの取得（存在しない場合はnull）
 * @returns {string|null} 購入者ID
 */
export const getCustomerId = () => {
  return localStorage.getItem('customer_id')
}
