// Cloudflare R2削除機能
import { supabase } from './supabase'

/**
 * R2からファイルを削除
 * @param {string} fileUrl ファイルのURL
 * @returns {Promise<boolean>} 削除成功かどうか
 */
export const deleteFileFromR2 = async (fileUrl) => {
  try {
    console.log('🔍 削除処理開始:', fileUrl)
    
    if (!fileUrl) {
      console.warn('⚠️ 削除対象のURLが空です')
      return true
    }

    // R2のURLかチェック
    const isR2Url = fileUrl.includes('cdn.sus-ec-shop.com') || 
                    fileUrl.includes('r2.cloudflarestorage.com') ||
                    fileUrl.includes('sus-ec-images')

    console.log('🔍 URL判定:', {
      url: fileUrl,
      isR2Url: isR2Url,
      containsCDN: fileUrl.includes('cdn.sus-ec-shop.com'),
      containsR2: fileUrl.includes('r2.cloudflarestorage.com'),
      containsBucket: fileUrl.includes('sus-ec-images')
    })

    if (!isR2Url) {
      console.log('📄 R2以外のファイルのため削除をスキップ:', fileUrl)
      return true
    }

    // URLからファイルキーを抽出
    const fileKey = extractFileKey(fileUrl)
    console.log('🔑 抽出されたファイルキー:', fileKey)
    
    if (!fileKey) {
      console.warn('⚠️ ファイルキーの抽出に失敗:', fileUrl)
      return false
    }

    console.log('🗑️ R2からファイルを削除:', {
      url: fileUrl,
      key: fileKey
    })

    // R2削除APIを呼び出し（開発環境では直接APIサーバーに接続）
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // 現在のポート番号を動的に取得
    const currentPort = window.location.port
    let apiUrl
    
    if (isDev) {
      // プロキシ経由で接続（現在のViteサーバーのポートを使用）
      apiUrl = `/api/r2-delete`
      console.log('🔧 開発環境 - プロキシ経由でAPI接続:', {
        currentUrl: window.location.href,
        currentPort: currentPort,
        apiUrl: apiUrl
      })
    } else {
      // 本番環境
      apiUrl = '/api/r2-delete'
    }
    
    console.log('📡 削除APIリクエスト開始:', {
      endpoint: apiUrl,
      method: 'DELETE',
      fileKey: fileKey,
      isDev: isDev,
      mode: import.meta.env.MODE,
      devEnv: import.meta.env.DEV
    })

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileKey: fileKey
      })
    })

    console.log('📡 削除APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ R2削除APIエラー:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        fileKey: fileKey,
        url: fileUrl
      })
      return false
    }

    const result = await response.json()
    console.log('✅ R2削除成功:', result)
    return true

  } catch (error) {
    console.error('❌ R2削除エラー:', error)
    return false
  }
}

/**
 * URLからファイルキーを抽出
 * @param {string} url ファイルURL
 * @returns {string|null} ファイルキー
 */
export const extractFileKey = (url) => {
  try {
    if (!url) return null

    // CDN URLの場合
    if (url.includes('cdn.sus-ec-shop.com')) {
      const parts = url.split('cdn.sus-ec-shop.com/')
      return parts.length > 1 ? parts[1] : null
    }

    // R2直接URLの場合
    if (url.includes('r2.cloudflarestorage.com')) {
      const parts = url.split('.r2.cloudflarestorage.com/')
      return parts.length > 1 ? parts[1] : null
    }

    // その他のパターン
    const urlObj = new URL(url)
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname

  } catch (error) {
    console.error('❌ URLパース エラー:', error)
    return null
  }
}

/**
 * 商品に関連するすべてのファイルをR2から削除
 * @param {Object} product 商品オブジェクト
 * @returns {Promise<Object>} 削除結果
 */
export const deleteProductFilesFromR2 = async (product) => {
  const results = {
    deleted: [],
    failed: [],
    skipped: []
  }

  try {
    console.log('🗑️ 商品関連ファイルの削除を開始:', product.id)

    // メイン画像を削除
    if (product.image) {
      const success = await deleteFileFromR2(product.image)
      if (success) {
        results.deleted.push({ type: 'image', url: product.image })
      } else {
        results.failed.push({ type: 'image', url: product.image })
      }
    }

    // R2画像URLを削除
    if (product.r2_image_url && product.r2_image_url !== product.image) {
      const success = await deleteFileFromR2(product.r2_image_url)
      if (success) {
        results.deleted.push({ type: 'r2_image', url: product.r2_image_url })
      } else {
        results.failed.push({ type: 'r2_image', url: product.r2_image_url })
      }
    }

    // R2動画URLを削除
    if (product.r2_video_url) {
      const success = await deleteFileFromR2(product.r2_video_url)
      if (success) {
        results.deleted.push({ type: 'r2_video', url: product.r2_video_url })
      } else {
        results.failed.push({ type: 'r2_video', url: product.r2_video_url })
      }
    }

    // 商品に関連する動画テーブルからも削除
    try {
      const { data: videos, error: videosError } = await supabase
        .from('product-videos')
        .select('video_url, thumbnail_url')
        .eq('product_id', product.id)

      if (!videosError && videos && videos.length > 0) {
        console.log(`📹 商品${product.id}に関連する動画を削除:`, videos)
        
        for (const video of videos) {
          // 動画ファイルを削除
          if (video.video_url) {
            const success = await deleteFileFromR2(video.video_url)
            if (success) {
              results.deleted.push({ type: 'video', url: video.video_url })
            } else {
              results.failed.push({ type: 'video', url: video.video_url })
            }
          }

          // サムネイルを削除
          if (video.thumbnail_url) {
            const success = await deleteFileFromR2(video.thumbnail_url)
            if (success) {
              results.deleted.push({ type: 'thumbnail', url: video.thumbnail_url })
            } else {
              results.failed.push({ type: 'thumbnail', url: video.thumbnail_url })
            }
          }
        }

        // データベースからも動画レコードを削除
        const { error: deleteVideosError } = await supabase
          .from('product-videos')
          .delete()
          .eq('product_id', product.id)

        if (deleteVideosError) {
          console.error('❌ 動画レコード削除エラー:', deleteVideosError)
        } else {
          console.log('✅ 動画レコードをDBから削除完了')
        }
      }
    } catch (error) {
      console.error('❌ 動画削除処理エラー:', error)
    }

    console.log('🗑️ 商品ファイル削除完了:', {
      productId: product.id,
      results: results
    })

    return results

  } catch (error) {
    console.error('❌ deleteProductFilesFromR2 エラー:', error)
    return results
  }
}

/**
 * R2削除APIの状態確認
 * @returns {Promise<boolean>} API利用可能かどうか
 */
export const checkR2DeleteAPI = async () => {
  try {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // 開発環境では常にプロキシ経由で接続
    const apiUrl = '/api/r2-delete/health'
    
    console.log('🔧 健康チェック - API接続情報:', {
      currentUrl: window.location.href,
      currentPort: window.location.port,
      isDev: isDev,
      apiUrl: apiUrl
    })
    
    const response = await fetch(apiUrl, {
      method: 'GET'
    })

    if (response.ok) {
      console.log('✅ R2削除APIサーバーが利用可能です')
      return true
    } else {
      console.warn('⚠️ R2削除APIサーバーが応答しません')
      return false
    }
  } catch (error) {
    console.warn('⚠️ R2削除API確認エラー:', error)
    return false
  }
}
