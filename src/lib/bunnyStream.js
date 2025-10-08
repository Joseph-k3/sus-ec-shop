// Bunny Stream クライアント
// 動画のアップロード、エンコーディング、配信を管理

class BunnyStreamClient {
  constructor() {
    this.libraryId = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID
    this.apiKey = import.meta.env.VITE_BUNNY_STREAM_API_KEY
    this.cdnHostname = import.meta.env.VITE_BUNNY_STREAM_CDN_HOSTNAME
    this.collectionId = import.meta.env.VITE_BUNNY_STREAM_COLLECTION_ID
    this.baseUrl = 'https://video.bunnycdn.com'
  }

  /**
   * 動画をアップロードしてエンコーディング開始
   * @param {File} file - 動画ファイル
   * @param {Object} metadata - 動画メタデータ
   * @param {Function} onProgress - 進捗コールバック
   * @returns {Promise<Object>} - アップロード結果とVideo ID
   */
  async uploadVideo(file, metadata = {}, onProgress = null) {
    try {
      console.log('🎬 Bunny Streamに動画アップロード開始:', {
        fileName: file.name,
        size: `${Math.round(file.size / 1024 / 1024)}MB`
      })

      // 1. ビデオエントリを作成
      const videoEntry = await this.createVideoEntry({
        title: metadata.title || file.name,
        collectionId: this.collectionId,
        ...metadata
      })

      console.log('✅ ビデオエントリ作成完了:', videoEntry.guid)

      // 2. 動画ファイルをアップロード
      await this.uploadVideoFile(videoEntry.guid, file, onProgress)

      // 3. エンコーディング開始（自動）
      console.log('🔄 エンコーディング開始（自動）')
      
      return {
        videoId: videoEntry.guid,
        title: videoEntry.title,
        status: 'uploading',
        playUrl: this.getPlayUrl(videoEntry.guid),
        thumbnailUrl: this.getThumbnailUrl(videoEntry.guid)
      }
    } catch (error) {
      console.error('❌ Bunny Streamアップロードエラー:', error)
      throw error
    }
  }

  /**
   * ビデオエントリをBunny Stream APIで作成
   */
  async createVideoEntry(metadata) {
    const response = await fetch(`${this.baseUrl}/library/${this.libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: metadata.title,
        collectionId: metadata.collectionId || this.collectionId
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to create video entry: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 動画ファイルをアップロード
   */
  async uploadVideoFile(videoId, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ 動画ファイルアップロード完了')
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      const uploadUrl = `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('AccessKey', this.apiKey)
      xhr.send(file)
    })
  }

  /**
   * 動画の情報を取得
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} - 動画情報
   */
  async getVideoInfo(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`, {
        headers: {
          'AccessKey': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get video info: ${response.status}`)
      }

      const videoInfo = await response.json()
      
      return {
        id: videoInfo.guid,
        title: videoInfo.title,
        status: videoInfo.status, // 0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=Error
        duration: videoInfo.length,
        fileSize: videoInfo.storageSize,
        width: videoInfo.width,
        height: videoInfo.height,
        views: videoInfo.views,
        playUrl: this.getPlayUrl(videoInfo.guid),
        thumbnailUrl: this.getThumbnailUrl(videoInfo.guid),
        hlsUrl: this.getHLSUrl(videoInfo.guid)
      }
    } catch (error) {
      console.error('❌ 動画情報取得エラー:', error)
      throw error
    }
  }

  /**
   * 動画を削除
   * @param {string} videoId - Video ID
   */
  async deleteVideo(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`)
      }

      console.log('✅ 動画削除完了:', videoId)
      return true
    } catch (error) {
      console.error('❌ 動画削除エラー:', error)
      throw error
    }
  }

  /**
   * 再生用URLを生成
   */
  getPlayUrl(videoId) {
    return `https://${this.cdnHostname}/${videoId}/playlist.m3u8`
  }

  /**
   * サムネイルURLを生成
   */
  getThumbnailUrl(videoId, width = 320, height = 180) {
    return `https://${this.cdnHostname}/${videoId}/${width}x${height}.jpg`
  }

  /**
   * HLS URLを生成
   */
  getHLSUrl(videoId) {
    return `https://${this.cdnHostname}/${videoId}/playlist.m3u8`
  }

  /**
   * 埋め込み用iframeコードを生成
   */
  getEmbedCode(videoId, width = 640, height = 360) {
    return `<iframe src="https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}" loading="lazy" style="border: none;" width="${width}" height="${height}" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;" allowfullscreen="true"></iframe>`
  }
}

// シングルトンインスタンス
export const bunnyStreamClient = new BunnyStreamClient()

/**
 * Bunny Stream設定の検証
 */
export const validateBunnyStreamConfig = () => {
  const client = new BunnyStreamClient()
  const required = ['libraryId', 'apiKey', 'cdnHostname']
  const missing = required.filter(key => !client[key])
  
  if (missing.length > 0) {
    console.warn('⚠️ Bunny Stream設定が不完全です:', missing)
    return false
  }
  
  console.log('✅ Bunny Stream設定OK')
  return true
}
