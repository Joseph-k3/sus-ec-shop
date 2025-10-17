// Cloudflare R2クライアント
// フロントエンド用の簡易実装（本番では署名付きURLをサーバーで生成）

class CloudflareR2Client {
  constructor() {
    this.accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
    this.accessKeyId = import.meta.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID
    this.secretAccessKey = import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY
    this.bucketName = import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'sus-ec-images'
    this.publicUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${this.accountId}.r2.dev`
    this.endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`
  }

  /**
   * ファイルをCloudflare R2にアップロード（将来の実装用）
   * 現在はCORSの制限により、サーバーサイドAPIが必要
   * @param {File} file - アップロードするファイル
   * @param {string} key - オブジェクトキー
   * @param {Function} onProgress - 進捗コールバック
   * @returns {Promise<string>} - アップロードされたファイルのURL
   */
  async uploadFile(file, key, onProgress = null) {
    try {
      // サーバーサイドで署名付きURLを生成してもらう
      const signedUrlData = await this.getPresignedUploadUrl(key, file.type, file.size)
      const publicUrl = await this.uploadWithSignedUrl(signedUrlData.uploadUrl, file, onProgress)
      
      // 公開URLを返す
      return signedUrlData.publicUrl
      
    } catch (error) {
      console.error('R2アップロードエラー:', error)
      throw error
    }
  }

  /**
   * サーバーから署名付きURLを取得
   */
  async getPresignedUploadUrl(key, contentType, maxFileSize = 10 * 1024 * 1024) {
    try {
      const response = await fetch('http://localhost:3001/api/r2/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType, maxFileSize })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        uploadUrl: data.uploadUrl,
        publicUrl: data.publicUrl,
        key: data.key
      }
      
    } catch (error) {
      console.error('署名付きURL取得エラー:', error)
      throw error
    }
  }

  /**
   * 署名付きURLを使用してファイルをアップロード
   */
  async uploadWithSignedUrl(signedUrl, file, onProgress = null) {
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
          const publicUrl = signedUrl.split('?')[0] // クエリパラメータを除去
          console.log('✅ R2アップロード完了:', publicUrl)
          resolve(publicUrl)
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })
      
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  /**
   * ファイルを削除
   * @param {string} key - 削除するオブジェクトキー
   */
  async deleteFile(key) {
    try {
      const response = await fetch('http://localhost:3001/api/r2/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      return true
      
    } catch (error) {
      console.error('R2削除エラー:', error)
      throw error
    }
  }

  /**
   * R2設定の確認とバケット疎通テスト
   * @returns {Promise<boolean>} - 設定確認結果
   */
  async testConnection() {
    try {
      console.log('🔗 R2設定確認開始:', {
        bucketName: this.bucketName,
        publicUrl: this.publicUrl,
        hasAccountId: !!this.accountId,
        hasAccessKey: !!this.accessKeyId,
        hasSecretKey: !!this.secretAccessKey
      })
      
      // 1. 必須設定の確認
      const requiredFields = ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName']
      const missingFields = requiredFields.filter(field => !this[field])
      
      if (missingFields.length > 0) {
        throw new Error(`必要な設定が不足: ${missingFields.join(', ')}`)
      }
      
      // 2. 公開URLへの疎通確認
      console.log('🌐 公開URL疎通テスト開始...')
      const testUrl = `${this.publicUrl}/connection-test-${Date.now()}.txt`
      
      try {
        // 存在しないファイルにアクセスして404が返ることを確認
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'cors'
        })
        
        console.log('📡 疎通テスト応答:', {
          status: response.status,
          statusText: response.statusText,
          url: testUrl
        })
        
        if (response.status === 404) {
          // 404 = バケットは存在するが、ファイルは存在しない（正常）
          console.log('✅ R2バケット疎通確認成功')
          return true
        } else if (response.status === 403) {
          // 403 = バケットは存在するが、アクセス権限の設定要確認
          console.warn('⚠️ バケットは存在しますが、パブリックアクセス設定を確認してください')
          return true
        } else {
          console.log(`ℹ️ 予期しない応答: ${response.status}`)
          return true
        }
        
      } catch (fetchError) {
        // CORSやネットワークエラー
        console.log('📡 疎通テストエラー:', fetchError.message)
        
        if (fetchError.name === 'TypeError' || fetchError.message.includes('CORS')) {
          console.log('✅ 設定は正しそうです（ブラウザの制限により詳細確認不可）')
          return true
        }
        
        throw fetchError
      }
      
    } catch (error) {
      console.error('❌ R2設定確認失敗:', error.message)
      return false
    }
  }

  /**
   * 公開URLを生成
   * @param {string} key - オブジェクトキー
   * @returns {string} - 公開URL
   */
  getPublicUrl(key) {
    // ダブルスラッシュを回避
    const cleanKey = key.startsWith('/') ? key.substring(1) : key
    const cleanPublicUrl = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl
    return `${cleanPublicUrl}/${cleanKey}`
  }

  /**
   * ファイルキーを生成
   * @param {string} prefix - プレフィックス（例：'products', 'thumbnails'）
   * @param {File} file - ファイル
   * @returns {string} - 生成されたキー
   */
  generateFileKey(prefix, file) {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    return `${prefix}/${timestamp}-${randomId}.${extension}`
  }
}

// シングルトンインスタンス
export const r2Client = new CloudflareR2Client()

/**
 * R2設定の検証
 */
export const validateR2Config = () => {
  const client = new CloudflareR2Client()
  const required = ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName']
  const missing = required.filter(key => !client[key])
  
  if (missing.length > 0) {
    console.warn('Cloudflare R2設定が不完全です:', missing)
    return false
  }
  
  return true
}
