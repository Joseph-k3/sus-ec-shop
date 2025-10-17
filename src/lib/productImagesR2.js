// 画像管理ライブラリ（Cloudflare R2対応版）
import { supabase } from './supabase'
import { r2Client, validateR2Config } from './cloudflareR2'

// 設定: 画像ストレージの選択
const USE_R2_FOR_IMAGES = import.meta.env.VITE_USE_R2_FOR_IMAGES === 'true'

/**
 * 画像をアップロード（R2またはSupabase Storageを自動選択）
 * @param {string} productId - 商品ID
 * @param {File} file - 画像ファイル
 * @param {Object} options - オプション
 * @param {Function} onProgress - 進捗コールバック
 * @returns {Promise<Object>} アップロード結果
 */
export async function uploadProductImage(productId, file, options = {}, onProgress = null) {
  try {
    let imageUrl
    let storageInfo = {}

    if (USE_R2_FOR_IMAGES && validateR2Config()) {
      // Cloudflare R2にアップロード
      const key = r2Client.generateFileKey(`products/${productId}`, file)
      imageUrl = await r2Client.uploadFile(file, key, onProgress)
      storageInfo = {
        storage_provider: 'cloudflare_r2',
        storage_key: key,
        storage_bucket: r2Client.bucketName
      }
    } else {
      // Supabase Storageにアップロード（フォールバック）
      imageUrl = await uploadToSupabaseStorage(productId, file, onProgress)
      storageInfo = {
        storage_provider: 'supabase',
        storage_key: extractSupabaseStorageKey(imageUrl),
        storage_bucket: 'succulents-images'
      }
    }

    // データベースにメタデータを保存
    const insertData = {
      product_id: productId,
      image_url: imageUrl,
      alt_text: options.altText || `${productId} 商品画像`,
      display_order: options.displayOrder || 0,
      is_primary: options.isPrimary || false,
      file_size: file.size,
      mime_type: file.type,
      original_filename: file.name,
      ...storageInfo
    }
    
    const { data, error } = await supabase
      .from('product_images')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ データベース保存エラー:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error)
    throw error
  }
}

/**
 * Supabase Storageにアップロード（フォールバック用）
 */
async function uploadToSupabaseStorage(productId, file, onProgress) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${productId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${productId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('succulents-images')
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        if (onProgress && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100)
          onProgress(percentage)
        }
      }
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('succulents-images')
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * 商品画像を削除
 * @param {string} imageId - 画像ID
 * @returns {Promise<boolean>} 削除成功可否
 */
export async function deleteProductImage(imageId) {
  try {
    // まず画像データを取得
    const { data: imageData, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('id', imageId)
      .single()

    if (fetchError || !imageData) {
      throw new Error('画像データが見つかりません')
    }

    // ストレージから削除
    if (imageData.storage_provider === 'cloudflare_r2' && imageData.storage_key) {
      // R2から削除
      await r2Client.deleteFile(imageData.storage_key)
    } else if (imageData.storage_provider === 'supabase') {
      // Supabaseから削除
      const urlParts = imageData.image_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      await supabase.storage
        .from('succulents-images')
        .remove([fileName])
    }

    // データベースから削除
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ 画像削除エラー:', error)
    throw error
  }
}

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
    console.error('❌ 画像取得エラー:', error)
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
    return null
  }
}

/**
 * 画像の表示順序を更新
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
 * 画像ストレージの設定状況を確認
 */
export function getImageStorageStatus() {
  return {
    useR2: USE_R2_FOR_IMAGES,
    r2Configured: validateR2Config(),
    fallbackToSupabase: !USE_R2_FOR_IMAGES || !validateR2Config()
  }
}
