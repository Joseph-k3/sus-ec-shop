import { supabase } from './supabase'

/**
 * 商品の画像一覧を取得
 * @param {string} productId - 商品ID
 * @returns {Promise<Array>} 画像一覧
 */
export async function getProductImages(productId) {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('商品画像の取得に失敗しました:', error)
    return []
  }
}

/**
 * 商品のメイン画像を取得
 * @param {string} productId - 商品ID
 * @returns {Promise<Object|null>} メイン画像
 */
export async function getPrimaryProductImage(productId) {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('メイン画像の取得に失敗しました:', error)
    return null
  }
}

/**
 * 商品画像を追加
 * @param {string} productId - 商品ID
 * @param {string} imageUrl - 画像URL
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 作成された画像データ
 */
export async function addProductImage(productId, imageUrl, options = {}) {
  try {
    const {
      displayOrder = 0,
      altText = '',
      isPrimary = false
    } = options

    // 既にプライマリ画像がある場合、新しい画像をプライマリにする時は既存を更新
    if (isPrimary) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId)
        .eq('is_primary', true)
    }

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        display_order: displayOrder,
        alt_text: altText,
        is_primary: isPrimary
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('商品画像の追加に失敗しました:', error)
    console.error('エラー詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw error
  }
}

/**
 * 商品画像を更新
 * @param {string} imageId - 画像ID
 * @param {Object} updates - 更新データ
 * @returns {Promise<Object>} 更新された画像データ
 */
export async function updateProductImage(imageId, updates) {
  try {
    // プライマリ画像を変更する場合
    if (updates.is_primary === true) {
      // まず該当商品の他の画像のプライマリフラグを解除
      const { data: currentImage } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('id', imageId)
        .single()

      if (currentImage) {
        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', currentImage.product_id)
          .eq('is_primary', true)
      }
    }

    const { data, error } = await supabase
      .from('product_images')
      .update(updates)
      .eq('id', imageId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('商品画像の更新に失敗しました:', error)
    throw error
  }
}

/**
 * 商品画像を削除
 * @param {string} imageId - 画像ID
 * @returns {Promise<boolean>} 削除成功可否
 */
export async function deleteProductImage(imageId) {
  try {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('商品画像の削除に失敗しました:', error)
    throw error
  }
}

/**
 * 商品画像の表示順序を更新
 * @param {Array} imageIds - 画像IDの配列（表示順序）
 * @returns {Promise<boolean>} 更新成功可否
 */
export async function updateImageDisplayOrder(imageIds) {
  try {
    const updates = imageIds.map((imageId, index) => ({
      id: imageId,
      display_order: index
    }))

    for (const update of updates) {
      await supabase
        .from('product_images')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
    }

    return true
  } catch (error) {
    console.error('表示順序の更新に失敗しました:', error)
    throw error
  }
}

/**
 * 商品の全画像を取得（フォールバック付き）
 * @param {Object} product - 商品データ
 * @returns {Promise<Array>} 画像一覧
 */
export async function getProductImagesWithFallback(product) {
  try {
    // 新しい画像テーブルから取得を試行
    const images = await getProductImages(product.id)
    
    if (images.length > 0) {
      return images
    }

    // フォールバック: 既存のimageフィールドを使用
    if (product.image) {
      return [{
        id: `fallback-${product.id}`,
        product_id: product.id,
        image_url: product.image,
        display_order: 0,
        alt_text: product.name,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    }

    return []
  } catch (error) {
    console.error('商品画像の取得に失敗しました:', error)
    return []
  }
}
