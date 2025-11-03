import { supabase } from './supabase'

/**
 * DBのストアドプロシージャを使って在庫を減らす
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<void>}
 */
export async function decreaseProductStock(productId, quantity = 1) {
  const { error } = await supabase.rpc('decrease_product_stock', {
    product_id: productId,
    quantity_to_decrease: quantity
  })
  if (error) throw error
}
