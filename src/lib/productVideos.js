import { supabase } from './supabase'

// ストレージプロバイダーの設定
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'supabase'
const USE_R2 = STORAGE_PROVIDER === 'r2'

/**
 * 商品の動画一覧を取得
 * @param {string} productId 商品ID
 * @returns {Array} 動画一覧
 */
export const getProductVideos = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('product_videos')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('動画の取得に失敗:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('getProductVideos エラー:', error)
    throw error
  }
}

/**
 * 商品動画を追加
 * @param {string} productId 商品ID
 * @param {string} videoUrl 動画URL
 * @param {Object} options オプション
 * @returns {Object} 追加された動画情報
 */
export const addProductVideo = async (productId, videoUrl, options = {}) => {
  try {
    const {
      title = '',
      description = '',
      thumbnailUrl = '',
      duration = 0,
      fileSize = 0,
      mimeType = 'video/mp4',
      displayOrder = 0,
      isPrimary = false
    } = options

    // プライマリ動画の場合、他のプライマリ動画を無効化
    if (isPrimary) {
      await supabase
        .from('product_videos')
        .update({ is_primary: false })
        .eq('product_id', productId)
        .eq('is_primary', true)
    }

    const insertData = {
      product_id: productId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      title,
      description,
      duration,
      file_size: fileSize,
      mime_type: mimeType,
      display_order: displayOrder,
      is_primary: isPrimary
    }

    const { data, error } = await supabase
      .from('product_videos')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ 動画の追加に失敗:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        insertData
      })
      throw error
    }

    return data
  } catch (error) {
    console.error('addProductVideo エラー:', error)
    throw error
  }
}

/**
 * 商品動画を更新
 * @param {string} videoId 動画ID
 * @param {Object} updates 更新内容
 * @returns {Object} 更新された動画情報
 */
export const updateProductVideo = async (videoId, updates) => {
  try {
    // プライマリ動画の場合、他のプライマリ動画を無効化
    if (updates.is_primary) {
      // まず、この動画の商品IDを取得
      const { data: videoData } = await supabase
        .from('product_videos')
        .select('product_id')
        .eq('id', videoId)
        .single()

      if (videoData) {
        await supabase
          .from('product_videos')
          .update({ is_primary: false })
          .eq('product_id', videoData.product_id)
          .eq('is_primary', true)
          .neq('id', videoId)
      }
    }

    const { data, error } = await supabase
      .from('product_videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single()

    if (error) {
      console.error('動画の更新に失敗:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('updateProductVideo エラー:', error)
    throw error
  }
}

/**
 * 商品動画を削除
 * @param {string} videoId 動画ID
 */
export const deleteProductVideo = async (videoId) => {
  console.log('deleteProductVideo called', videoId)
  try {
    // 動画情報を取得してストレージからも削除
    const { data: videoData } = await supabase
      .from('product_videos')
      .select('video_url, thumbnail_url, storage_provider')
      .eq('id', videoId)
      .single()

    if (videoData) {
      console.log('🗑️ 動画削除開始:', {
        videoId,
        video_url: videoData.video_url,
        thumbnail_url: videoData.thumbnail_url,
        storage_provider: videoData.storage_provider,
        USE_R2,
      })
      // ここで分岐条件を明示的にログ
      if (USE_R2 || videoData.storage_provider === 'r2') {
        console.log('🟢 R2削除分岐に入ります')
        // 動画ファイルをR2から削除
        if (videoData.video_url) {
          await deleteFromR2(videoData.video_url)
        }
        // サムネイルをR2から削除
        if (videoData.thumbnail_url) {
          await deleteFromR2(videoData.thumbnail_url)
        }
      } else {
        console.log('🟡 Supabase削除分岐に入ります')
        // Supabaseストレージから削除
        if (videoData.video_url) {
          const videoPath = videoData.video_url.split('/').pop()
          if (videoPath) {
            const { error: deleteError } = await supabase.storage
              .from('product_videos')
              .remove([videoPath])
            
            if (deleteError) {
              console.error('⚠️ Supabase動画削除エラー:', deleteError)
            } else {
              console.log('✅ Supabase動画削除成功:', videoPath)
            }
          }
        }

        // サムネイルをSupabaseストレージから削除
        if (videoData.thumbnail_url) {
          const thumbnailPath = videoData.thumbnail_url.split('/').pop()
          if (thumbnailPath) {
            const { error: deleteError } = await supabase.storage
              .from('product_videos')
              .remove([thumbnailPath])
            
            if (deleteError) {
              console.error('⚠️ Supabaseサムネイル削除エラー:', deleteError)
            } else {
              console.log('✅ Supabaseサムネイル削除成功:', thumbnailPath)
            }
          }
        }
      }
    } else {
      console.warn('videoData is null for videoId:', videoId)
    }

    // DBから削除
    const { error } = await supabase
      .from('product_videos')
      .delete()
      .eq('id', videoId)

    if (error) {
      console.error('❌ DB削除に失敗:', error)
      throw error
    }

    console.log('✅ 動画削除完了:', videoId)
  } catch (error) {
    console.error('❌ deleteProductVideo エラー:', error)
    throw error
  }
}

/**
 * R2からファイルを削除
 * @param {string} fileUrl ファイルのURL
 */
const deleteFromR2 = async (fileUrl) => {
  try {
    console.log('🗑️ R2削除処理開始:', fileUrl)
    let fileKey = ''
    // 1. .r2.dev/ 以降に /products/ があれば必ずそこから
    const r2DevIdx = fileUrl.indexOf('.r2.dev/')
    if (r2DevIdx !== -1) {
      const afterR2 = fileUrl.substring(r2DevIdx + 9)
      const productsIdx = afterR2.indexOf('products/')
      if (productsIdx !== -1) {
        fileKey = afterR2.substring(productsIdx)
        console.log('✅ .r2.dev/ 以降の products/ から抽出:', fileKey)
      } else {
        // sus-ec-images/ で始まる場合は除去
        if (afterR2.startsWith('sus-ec-images/')) {
          fileKey = afterR2.replace('sus-ec-images/', '')
          console.log('✅ sus-ec-images/ 除去:', fileKey)
        } else {
          fileKey = afterR2
          console.log('✅ .r2.dev/ 以降から抽出:', fileKey)
        }
      }
    } else {
      // 2. 既存のパス形式抽出ロジック
      const urlParts = fileUrl.split('/')
      const pathIndex = urlParts.findIndex(part => part === 'products' || part === 'videos' || part === 'images')
      if (pathIndex !== -1) {
        fileKey = urlParts.slice(pathIndex).join('/')
        console.log('✅ パス形式から抽出:', fileKey)
      } else {
        // 最後の有効なパスを取得（少なくとも3階層）
        const validParts = urlParts.filter(part => part && part !== 'https:' && part !== 'http:')
        if (validParts.length >= 3) {
          fileKey = validParts.slice(-5).join('/')
          console.log('✅ 最後の5パスから抽出:', fileKey)
        }
      }
    }
    if (!fileKey) {
      console.warn('⚠️ ファイルキーを抽出できませんでした:', fileUrl)
      return
    }

    console.log('🗑️ R2削除リクエスト:', {
      fileUrl,
      extractedFileKey: fileKey
    })

    // R2削除APIを呼び出し
    const response = await fetch('/api/r2-delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKey })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ R2削除APIエラー:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        fileKey
      })
      
      // 404の場合はファイルが既に削除されているので警告のみ
      if (response.status === 404 || errorData.message?.includes('NoSuchKey')) {
        console.warn('⚠️ ファイルは既に存在しません:', fileKey)
        return
      }
      
      throw new Error(`R2削除エラー: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ R2削除成功:', result)

  } catch (error) {
    console.error('❌ R2削除エラー:', {
      error: error.message,
      fileUrl
    })
    // エラーをthrowせず、ログだけ出力（ファイルが既に削除されている可能性があるため）
  }
}

/**
 * 動画の表示順序を更新
 * @param {Array} videoIds 動画IDの配列（新しい順序）
 */
export const updateVideoDisplayOrder = async (videoIds) => {
  try {
    const promises = videoIds.map((videoId, index) =>
      supabase
        .from('product_videos')
        .update({ display_order: index })
        .eq('id', videoId)
    )

    await Promise.all(promises)
  } catch (error) {
    console.error('updateVideoDisplayOrder エラー:', error)
    throw error
  }
}

/**
 * 動画ファイルをストレージにアップロード（SupabaseまたはR2）
 * @param {File} file 動画ファイル
 * @param {Function} onProgress 進捗コールバック
 * @returns {Object} アップロード結果
 */
export const uploadVideoToStorage = async (file, onProgress = null) => {
  try {
    // ファイルサイズチェック
    if (!checkVideoFileSize(file)) {
      throw new Error('ファイルサイズが制限を超えています')
    }

    // R2を使用する場合
    if (USE_R2) {
      return await uploadVideoToR2(file, onProgress)
    }

    // Supabaseストレージを使用する場合
    // バケットの存在確認
    const bucketExists = await checkStorageBucket()
    if (!bucketExists) {
      throw new Error('ストレージバケット "product-videos" が見つかりません。Supabaseダッシュボードでバケットを作成してください。\n\n手順:\n1. Supabase Dashboard → Storage\n2. "Create a new bucket" をクリック\n3. Name: "product-videos"\n4. "Public bucket" にチェック\n5. "Create bucket" をクリック')
    }

    // ファイル名を生成（年月ベース）
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExtension = file.name.split('.').pop()
    const fileName = `products/${year}/${month}/videos/video_${timestamp}_${randomId}.${fileExtension}`

    // ストレージにアップロード
    const { data, error } = await supabase.storage
      .from('product_videos')
      .upload(fileName, file, {
        onUploadProgress: (progress) => {
          if (onProgress && progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100)
            onProgress(percentage)
          }
        }
      })

    if (error) {
      // バケットが見つからない場合の特別なエラーメッセージ
      if (error.message && error.message.includes('bucket') && error.message.includes('not found')) {
        console.error('Bucket not found error. バケット "product-videos" が存在しません。', {
          error,
          solution: 'Supabaseダッシュボードでストレージバケット "product-videos" を作成してください。'
        })
        throw new Error('ストレージバケット "product-videos" が見つかりません。Supabaseダッシュボードでバケットを作成してください。')
      }
      
      console.error('動画のアップロードに失敗:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      throw error
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('product_videos')
      .getPublicUrl(fileName)

    return {
      videoUrl: publicUrl,
      fileName: fileName,
      fileSize: file.size,
      mimeType: file.type
    }
  } catch (error) {
    console.error('uploadVideoToStorage エラー:', {
      error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })
    throw error
  }
}

/**
 * 動画からサムネイルを生成
 * @param {File} videoFile 動画ファイル
 * @returns {Promise<string>} サムネイル画像のData URL
 */
export const generateVideoThumbnail = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    video.onloadedmetadata = () => {
      // キャンバスサイズを設定
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // 1秒の位置でキャプチャ
      video.currentTime = 1
    }
    
    video.onseeked = () => {
      try {
        // キャンバスに描画
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Data URLとして取得
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(thumbnailDataUrl)
      } catch (error) {
        reject(error)
      }
    }
    
    video.onerror = () => {
      reject(new Error('動画の読み込みに失敗しました'))
    }
    
    // 動画ファイルを読み込み
    const url = URL.createObjectURL(videoFile)
    video.src = url
    video.load()
  })
}

/**
 * Data URLをBlobに変換
 * @param {string} dataUrl Data URL
 * @returns {Blob} Blobオブジェクト
 */
export const dataUrlToBlob = (dataUrl) => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
}

/**
 * 動画の長さを取得
 * @param {File} file 動画ファイル
 * @returns {Promise<number>} 動画の長さ（秒）
 */
export const getVideoDuration = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.onloadedmetadata = () => {
      resolve(Math.round(video.duration))
    }
    video.onerror = () => {
      resolve(0) // エラーの場合は0秒
    }
    const url = URL.createObjectURL(file)
    video.src = url
    video.load()
  })
}

/**
 * 動画ファイルをR2にアップロード
 * @param {File} file 動画ファイル
 * @param {Function} onProgress 進捗コールバック
 * @returns {Object} アップロード結果
 */
export const uploadVideoToR2 = async (file, onProgress = null) => {
  try {
    console.log('🌥️ R2へのアップロードを開始:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: Math.round(file.size / 1024 / 1024),
      fileType: file.type
    })

    // ファイルサイズチェック (200MB制限)
    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) {
      const errorMsg = `ファイルサイズが大きすぎます (最大: 200MB, 実際: ${Math.round(file.size / 1024 / 1024)}MB)`
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    console.log('✅ ファイルサイズチェック通過')

    // ファイル名を生成
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExtension = file.name.split('.').pop()
    const fileName = `videos/video_${timestamp}_${randomId}.${fileExtension}`
    
    console.log('📝 生成されたファイル名:', fileName)

    // FormDataを作成
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'video')
    formData.append('filename', fileName)

    // R2アップロードAPIを呼び出し
    const response = await fetch('/api/r2-upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      let errorMessage = `R2アップロードエラー: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        console.error('❌ R2アップロードAPIエラー詳細:', errorData)
        
        if (errorData.error) {
          errorMessage = errorData.error
        }
        if (errorData.code === 'LIMIT_FILE_SIZE') {
          errorMessage = 'ファイルサイズが大きすぎます（最大: 200MB）'
        }
      } catch (parseError) {
        // JSONのパースに失敗した場合はテキストを取得
        const errorText = await response.text()
        console.error('❌ R2アップロードAPIエラー (テキスト):', errorText)
        if (errorText) {
          errorMessage += ` - ${errorText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('✅ R2アップロード完了:', result)

    if (!result.url) {
      throw new Error('R2からのレスポンスにURLが含まれていません')
    }

    return {
      videoUrl: result.url,  // videoUrlとして返す
      fileName: result.fileName || fileName,
      fileSize: file.size,
      mimeType: file.type
    }

  } catch (error) {
    console.error('❌ R2アップロードエラー:', error)
    throw error  // エラーを再スローして呼び出し元でキャッチ
  }
}

/**
 * ストレージバケットの存在確認
 * @returns {Promise<boolean>} バケットが存在するかどうか
 */
export const checkStorageBucket = async () => {
  try {
    console.log('🔍 バケット一覧を取得中...')
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    console.log('📋 バケット取得結果:', {
      data: buckets,
      error: error,
      bucketsCount: buckets?.length || 0
    })
    
    if (error) {
      console.error('❌ バケット一覧の取得に失敗:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      return false
    }
     if (!buckets || buckets.length === 0) {
      console.warn('⚠️ バケットが1つも見つかりません')
      // バケットを自動作成してみる
      return await createProductVideosBuffer()
    }

    const bucketNames = buckets.map(b => b.name)
    const hasProductVideosBucket = buckets.some(bucket => bucket.name === 'product_videos')

    console.log('📁 利用可能なバケット:', bucketNames)
    console.log('🎬 product-videos バケット存在:', hasProductVideosBucket)

    // バケット詳細情報もログ出力
    const productVideosBucket = buckets.find(b => b.name === 'product_videos')
    if (productVideosBucket) {
      console.log('🎬 product-videos バケット詳細:', productVideosBucket)
    }

    // バケットが存在しない場合は作成を試行
    if (!hasProductVideosBucket) {
      console.log('🛠️ product-videos バケットが存在しないため、作成を試行します')
      return await createProductVideosBuffer()
    }

    return hasProductVideosBucket
  } catch (error) {
    console.error('❌ checkStorageBucket エラー:', {
      error,
      message: error?.message,
      stack: error?.stack
    })
    return false
  }
}

/**
 * product-videosバケットを作成
 * @returns {Promise<boolean>} 作成成功かどうか
 */
export const createProductVideosBuffer = async () => {
  try {
    console.log('🛠️ product-videos バケットを作成中...')
    
    const { data, error } = await supabase.storage.createBucket('product_videos', {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    })
    
    if (error) {
      console.error('❌ バケット作成エラー:', error)
      
      // バケットが既に存在する場合のエラーは無視
      if (error.message?.includes('already exists') || error.message?.includes('Duplicate')) {
        console.log('✅ バケットは既に存在します')
        return true
      }
      
      return false
    }
    
    console.log('✅ product-videos バケットを作成しました:', data)
    return true
    
  } catch (error) {
    console.error('❌ createProductVideosBuffer エラー:', error)
    return false
  }
}

/**
 * バケットへの直接アクセステスト
 * @returns {Promise<Object>} テスト結果
 */
export const testBucketAccess = async () => {
  const results = {
    listBuckets: null,
    listFiles: null,
    uploadTest: null,
    deleteTest: null
  }

  try {
    // 1. バケット一覧取得テスト
    console.log('🧪 テスト1: バケット一覧取得')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    results.listBuckets = { data: buckets, error: listError }
    console.log('結果:', results.listBuckets)

    if (listError) {
      console.error('❌ バケット一覧取得失敗')
      return results
    }

    // 2. product-videos バケット内のファイル一覧取得テスト
    console.log('🧪 テスト2: product-videos バケット内ファイル一覧')
    const { data: files, error: filesError } = await supabase.storage
      .from('product_videos')
      .list('', { limit: 10 })
    results.listFiles = { data: files, error: filesError }
    console.log('結果:', results.listFiles)

    // 3. 小さなテストファイルのアップロード
    console.log('🧪 テスト3: テストファイルアップロード')
    const testBlob = new Blob(['test'], { type: 'text/plain' })
    const testFileName = `test_${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product_videos')
      .upload(testFileName, testBlob)
    results.uploadTest = { data: uploadData, error: uploadError }
    console.log('結果:', results.uploadTest)

    // 4. テストファイルの削除
    if (!uploadError) {
      console.log('🧪 テスト4: テストファイル削除')
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('product_videos')
        .remove([testFileName])
      results.deleteTest = { data: deleteData, error: deleteError }
      console.log('結果:', results.deleteTest)
    }

    return results
  } catch (error) {
    console.error('❌ バケットアクセステスト中にエラー:', error)
    return { ...results, testError: error }
  }
}

/**
 * 現在の認証状態を確認
 * @returns {Promise<Object>} 認証情報
 */
export const checkAuthStatus = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('🔐 認証状態:', {
      user: user,
      error: error,
      isAuthenticated: !!user,
      userId: user?.id,
      email: user?.email,
      role: user?.role
    })
    
    return {
      user,
      error,
      isAuthenticated: !!user
    }
  } catch (error) {
    console.error('❌ 認証状態確認エラー:', error)
    return {
      user: null,
      error,
      isAuthenticated: false
    }
  }
}

/**
 * ストレージ使用量とバケット情報を詳細確認
 * @returns {Promise<Object>} ストレージ情報
 */
export const getStorageInfo = async () => {
  try {
    console.log('📊 ストレージ情報を取得中...')
    
    // バケット一覧とサイズ情報を取得
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ バケット情報取得エラー:', bucketsError)
      return { error: bucketsError }
    }
    
    console.log('📁 バケット一覧:', buckets)
    
    const bucketInfo = []
    
    // 各バケットの詳細情報を取得
    for (const bucket of buckets) {
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000, offset: 0 })
        
        if (!filesError && files) {
          const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          const fileCount = files.length
          
          bucketInfo.push({
            name: bucket.name,
            fileCount,
            totalSize,
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            files: files.slice(0, 5) // 最初の5ファイルのみ表示
          })
        }
      } catch (error) {
        console.warn(`⚠️ バケット ${bucket.name} の情報を取得できませんでした:`, error)
      }
    }
    
    console.log('📊 バケット使用量:', bucketInfo)
    
    return {
      buckets,
      bucketInfo,
      totalBuckets: buckets.length
    }
  } catch (error) {
    console.error('❌ ストレージ情報取得エラー:', error)
    return { error }
  }
}

/**
 * 動画ファイルサイズをチェックして警告表示
 * @param {File} file 動画ファイル
 * @returns {Boolean} アップロード可能かどうか
 */
export const checkVideoFileSize = (file) => {
  const maxSize = 50 * 1024 * 1024 // 50MB制限
  const fileSizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100
  
  console.log(`📹 動画ファイル: ${file.name}`)
  console.log(`📊 ファイルサイズ: ${fileSizeMB}MB`)
  
  if (file.size > maxSize) {
    alert(`⚠️ ファイルサイズが大きすぎます: ${fileSizeMB}MB\n\n推奨サイズ: 50MB以下\n\n大きなファイルは以下の方法で圧縮してください:\n1. HandBrake（無料）\n2. オンライン動画圧縮ツール\n3. FFmpeg`)
    return false
  }
  
  if (file.size > 20 * 1024 * 1024) { // 20MB以上で警告
    const confirm = window.confirm(`⚠️ ファイルサイズが大きいです: ${fileSizeMB}MB\n\nストレージ制限により、大きなファイルは\nアップロードに失敗する可能性があります。\n\n続行しますか？`)
    return confirm
  }
  
  return true
}

/**
 * 動画を削除
 * @param {string} videoId 動画ID
 */
const deleteVideo = async (videoId) => {
  console.log('deleteVideo called', videoId)
  if (!confirm('この動画を削除しますか？\n\n※ R2ストレージからも物理的に削除されます。')) return
  try {
    console.log('🗑️ 動画削除開始:', videoId)
    await deleteProductVideo(videoId)
    console.log('✅ 動画削除成功:', videoId)
    await loadProductVideos(editingId.value)
    alert('動画とR2ストレージから削除しました')
  } catch (error) {
    console.error('❌ 動画の削除に失敗しました:', error)
    alert('動画の削除に失敗しました（R2ストレージの物理削除も含む）:\n\n' + error.message)
  }
}
