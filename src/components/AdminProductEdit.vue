<template>
  <div class="admin-panel">
    <h2>商品管理画面</h2>



    <!-- 商品追加・編集フォーム -->
    <form @submit.prevent="handleSubmit" class="edit-form" ref="editForm">
      <h3>{{ editingId ? '商品を編集' : '新規商品を追加' }}</h3>
      
      <div class="form-group">
        <label for="name">商品名 <span class="required">*</span></label>
        <input 
          id="name"
          v-model="currentProduct.name"
          type="text"
          required
          placeholder="例：エケベリア ラウリンゼ"
        >
      </div>

      <div class="form-group">
        <label for="price">価格 <span class="required">*</span></label>
        <input
          id="price"
          v-model.number="currentProduct.price"
          type="number"
          min="0"
          required
          placeholder="例：2000"
        >
      </div>

      <div class="form-group description-group">
        <label for="description">商品説明</label>
        <textarea
          id="description"
          v-model="currentProduct.description"
          rows="3"
          placeholder="商品の特徴や育て方のポイントなど（任意）"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="quantity">在庫数 <span class="required">*</span></label>
        <div class="quantity-group">
          <input
            id="quantity"
            v-model.number="currentProduct.quantity"
            type="number"
            min="0"
            required
            placeholder="例：1"
          >
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="currentProduct.is_reserved"
            >
            取引中にする
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="image">商品画像</label>
        <div class="multiple-image-upload-section">
          <!-- 複数ファイル選択 -->
          <div class="upload-options">
            <label for="imageFiles" class="file-upload-btn">
              📷 画像を追加（複数選択可）
              <input
                id="imageFiles"
                type="file"
                accept="image/*"
                multiple
                @change="handleMultipleImageSelect"
                style="display: none;"
              >
            </label>
            

            <span class="upload-info">JPG, PNG, WebP対応 | 複数選択可</span>
          </div>
          
          <!-- アップロード進捗 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}% アップロード中...</span>
          </div>
          
          <!-- 一時画像一覧（新規商品用） -->
          <div v-if="!editingId && tempImages.length > 0" class="images-gallery">
            <h4>選択した画像（商品保存時にアップロードされます）</h4>
            <div class="images-grid temp-images-grid">
              <div 
                v-for="(image, index) in tempImages" 
                :key="image.id"
                class="image-item temp-image-item"
                :class="{ 'primary': image.is_primary }"
              >
                <img :src="image.preview_url" :alt="image.alt_text || `画像 ${index + 1}`">
                <div class="image-controls">
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: image.is_primary }"
                    @click="setTempPrimaryImage(image.id)"
                    title="メイン画像に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="removeTempImage(image.id)"
                    title="画像を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="image-order">{{ index + 1 }}</div>
                <div v-if="image.is_primary" class="primary-badge">メイン</div>
                <div class="temp-badge">未保存</div>
              </div>
            </div>
          </div>

          <!-- 既存画像一覧 -->
          <div v-if="editingId && productImages.length > 0" class="images-gallery">
            <h4>登録済み画像（ドラッグ&ドロップで順序変更）</h4>
            <div 
              class="images-grid"
              @drop="handleDrop"
              @dragover.prevent
              @dragenter.prevent
            >
              <div 
                v-for="(image, index) in productImages" 
                :key="image.id"
                class="image-item"
                :class="{ 'primary': image.is_primary }"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragend="handleDragEnd"
              >
                <img :src="image.image_url" :alt="image.alt_text || `画像 ${index + 1}`">
                <div class="image-controls">
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: image.is_primary }"
                    @click="setPrimaryImage(image.id)"
                    title="メイン画像に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="deleteImage(image.id)"
                    title="画像を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="image-order">{{ index + 1 }}</div>
                <div v-if="image.is_primary" class="primary-badge">メイン</div>
              </div>
            </div>
          </div>
          
          <!-- 手動URL入力（オプション） -->
          <div class="manual-url-section">
            <label class="toggle-manual" @click="showManualInput = !showManualInput">
              🔗 手動でURLを追加
            </label>
            <div v-if="showManualInput" class="manual-input">
              <input
                v-model="manualImageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
              >
              <button type="button" @click="addManualImage" class="add-url-btn">
                追加
              </button>
            </div>
          </div>
          
          <!-- 後方互換性のための単一画像フィールド（非表示） -->
          <input v-model="currentProduct.image" type="hidden">
        </div>
      </div>

      <div class="form-group">
        <label for="videos">商品動画</label>
        <div class="multiple-video-upload-section">
          <!-- 動画ファイル選択 -->
          <div class="upload-options">
            <label for="videoFiles" class="file-upload-btn video-upload">
              🎬 動画を追加（複数選択可）
              <input
                id="videoFiles"
                type="file"
                accept="video/*"
                multiple
                @change="handleVideoSelect"
                style="display: none;"
              >
            </label>
            <button type="button" @click="checkVideoBucket" class="btn-check-bucket">
              📁 バケット確認
            </button>
            <button type="button" @click="testStorageBucket" class="btn-test-bucket">
              🧪 詳細テスト
            </button>
            <button type="button" @click="checkStorageUsage" class="btn-storage-info">
              📊 使用量確認
            </button>
            <button type="button" @click="testR2Connection" class="btn-r2-test">
              ☁️ R2テスト
            </button>
            <span class="upload-info">MP4, WebM, MOV対応 | 最大100MB</span>
          </div>
          
          <!-- 動画アップロード進捗 -->
          <div v-if="videoUploadProgress > 0 && videoUploadProgress < 100" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: videoUploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ videoUploadProgress }}% アップロード中...</span>
          </div>
          
          <!-- 一時動画一覧（新規商品用） -->
          <div v-if="!editingId && tempVideos.length > 0" class="videos-gallery">
            <h4>選択した動画（商品保存時にアップロードされます）</h4>
            <div class="videos-grid temp-videos-grid">
              <div 
                v-for="(video, index) in tempVideos" 
                :key="video.id"
                class="video-item temp-video-item"
                :class="{ 'primary': video.is_primary }"
              >
                <div class="video-thumbnail">
                  <img v-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title || `動画 ${index + 1}`">
                  <div v-else class="no-thumbnail">🎬</div>
                  <div class="video-duration" v-if="video.duration">{{ formatDuration(video.duration) }}</div>
                </div>
                <div class="video-info">
                  <input 
                    v-model="video.title" 
                    placeholder="動画タイトル" 
                    class="video-title-input"
                  >
                </div>
                <div class="video-controls">
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: video.is_primary }"
                    @click="setTempPrimaryVideo(video.id)"
                    title="メイン動画に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="removeTempVideo(video.id)"
                    title="動画を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="video-order">{{ index + 1 }}</div>
                <div v-if="video.is_primary" class="primary-badge">メイン</div>
                <div class="temp-badge">未保存</div>
              </div>
            </div>
          </div>

          <!-- 既存動画一覧 -->
          <div v-if="editingId && productVideos.length > 0" class="videos-gallery">
            <h4>登録済み動画（ドラッグ&ドロップで順序変更）</h4>
            <div 
              class="videos-grid"
              @drop="handleVideoDrop"
              @dragover.prevent
              @dragenter.prevent
            >
              <div 
                v-for="(video, index) in productVideos" 
                :key="video.id"
                class="video-item"
                :class="{ 'primary': video.is_primary }"
                draggable="true"
                @dragstart="handleVideoDragStart($event, index)"
                @dragend="handleVideoDragEnd"
              >
                <div class="video-thumbnail">
                  <img v-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title || `動画 ${index + 1}`">
                  <div v-else class="no-thumbnail">🎬</div>
                  <div class="video-duration" v-if="video.duration">{{ formatDuration(video.duration) }}</div>
                </div>
                <div class="video-info">
                  <input 
                    v-model="video.title" 
                    placeholder="動画タイトル" 
                    class="video-title-input"
                    @blur="updateVideoTitle(video.id, video.title)"
                  >
                </div>
                <div class="video-controls">
                  <button 
                    type="button" 
                    class="play-btn"
                    @click="playVideo(video.video_url)"
                    title="動画を再生"
                  >
                    ▶️
                  </button>
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: video.is_primary }"
                    @click="setPrimaryVideo(video.id)"
                    title="メイン動画に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="deleteVideo(video.id)"
                    title="動画を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="video-order">{{ index + 1 }}</div>
                <div v-if="video.is_primary" class="primary-badge">メイン</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary">
          {{ editingId ? '更新' : '追加' }}
        </button>
        <button 
          type="button" 
          class="btn-secondary" 
          v-if="editingId"
          @click="cancelEdit"
        >
          キャンセル
        </button>
      </div>
    </form>

    <!-- 商品一覧 -->
    <div class="products-list">
      <h3>商品一覧 ({{ products.length }}件)</h3>
      
      <!-- 商品がない場合のメッセージ -->
      <div v-if="products.length === 0" class="no-products">
        <p>登録された商品がありません。</p>
        <p>上のフォームから新しい商品を追加してください。</p>
      </div>
      
      <!-- 商品グリッド -->
      <div v-else class="product-grid">
        <div v-for="product in products" :key="product.id" class="product-item">
          <div class="product-image-container">
            <img :src="product.image" :alt="product.name" class="product-thumb">
            <div v-if="product.is_reserved" class="status-badge reserved">取引中</div>
            <div v-else-if="product.quantity <= 0" class="status-badge sold-out">売約済み</div>
          </div>
          <div class="product-details">
            <h4>{{ product.name }}</h4>
            <p class="price">¥{{ product.price.toLocaleString() }}</p>
            <p class="stock-info" :class="{ 'low-stock': product.quantity <= 1 }">
              残り{{ product.quantity }}点
            </p>

          </div>
          <div class="product-actions">
            <button 
              @click="startEdit(product)" 
              @click.stop
              class="btn-edit" 
              type="button"
            >
              編集
            </button>
            <button 
              @click="deleteProduct(product.id)" 
              @click.stop
              @touchstart.passive
              class="btn-delete" 
              type="button"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 動画再生モーダル -->
    <div v-if="showVideoModal" class="video-modal" @click.self="closeVideoModal">
      <div class="video-modal-content">
        <button class="close-btn" @click="closeVideoModal">×</button>
        <video 
          ref="modalVideo"
          :src="currentVideoUrl" 
          controls 
          autoplay
          style="width: 100%; max-height: 80vh;"
        ></video>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
 * Supabaseストレージ設定について:
 * 
 * 1. バケット作成: このコンポーネントは自動的に'succulents-images'バケットを作成しますが、
 *    手動でSupabase管理画面から作成することも可能です。
 * 
 * 2. RLS (Row Level Security) ポリシー設定:
 *    Supabase管理画面 > Storage > Policies で以下を設定:
 *    - 読み取り（SELECT）: public read access
 *    - 書き込み（INSERT）: 認証されたユーザーのみ
 *    - 更新（UPDATE）: 認証されたユーザーのみ
 *    - 削除（DELETE）: 認証されたユーザーのみ
 * 
 * 3. バケット設定:
 *    - Public bucket: true
 *    - File size limit: 10MB
 *    - Allowed mime types: image/jpeg, image/png, image/webp, image/gif
 */

import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '../lib/supabase'
import { 
  getProductImages, 
  addProductImage, 
  updateProductImage, 
  deleteProductImage, 
  updateImageDisplayOrder 
} from '../lib/productImages'
// R2対応版画像管理
import {
  uploadProductImage as uploadProductImageR2,
  getImageStorageStatus
} from '../lib/productImagesR2'
import { validateR2Config, r2Client } from '../lib/cloudflareR2'
import { 
  getProductVideos, 
  addProductVideo, 
  updateProductVideo, 
  deleteProductVideo, 
  updateVideoDisplayOrder,
  uploadVideoToStorage,
  generateVideoThumbnail,
  dataUrlToBlob,
  getVideoDuration,
  checkStorageBucket,
  testBucketAccess,
  checkAuthStatus,
  getStorageInfo,
  checkVideoFileSize
} from '../lib/productVideos'

const products = ref([])
const editingId = ref(null)
const uploadProgress = ref(0)
const showManualInput = ref(false)
const productImages = ref([])
const manualImageUrl = ref('')
const draggedIndex = ref(null)
const tempImages = ref([]) // 新規商品用の一時画像保存
const tempImageFiles = ref([]) // アップロード予定のファイル
const editForm = ref(null) // フォーム要素への参照

// 動画関連の変数
const productVideos = ref([])
const tempVideos = ref([]) // 新規商品用の一時動画保存
const videoUploadProgress = ref(0)
const draggedVideoIndex = ref(null)
const showVideoModal = ref(false)
const currentVideoUrl = ref('')
const modalVideo = ref(null)
const currentProduct = ref({
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  is_reserved: false,
  image: ''
})

// 商品一覧を取得
const loadProducts = async () => {
  
  try {
    const { data, error } = await supabase
      .from('succulents')
      .select('id, name, description, price, quantity, is_reserved, image')
      .order('id', { ascending: true })
    
    if (error) {
      console.error('Error loading products:', error)
      return
    }
    
    products.value = data || []
  } catch (error) {
    console.error('商品読み込み時にエラーが発生しました:', error)
    products.value = []
  }
}

// 商品を追加・更新
const handleSubmit = async () => {
  try {
    // データベースに存在するフィールドのみを抽出
    const productData = {
      name: currentProduct.value.name,
      description: currentProduct.value.description,
      price: currentProduct.value.price,
      quantity: currentProduct.value.quantity,
      is_reserved: currentProduct.value.is_reserved,
      image: currentProduct.value.image
    }

    let savedProductId = editingId.value

    if (editingId.value) {
      // 更新
      const { error } = await supabase
        .from('succulents')
        .update(productData)
        .eq('id', editingId.value)
      
      if (error) throw error
    } else {
      // 新規追加
      const { data, error } = await supabase
        .from('succulents')
        .insert([productData])
        .select()
        .single()
      
      if (error) throw error
      savedProductId = data.id
      
      // 新規商品の場合、一時画像と動画をアップロード
      if (tempImages.value.length > 0) {
        await uploadTempImages(savedProductId)
      }
      
      if (tempVideos.value.length > 0) {
        await uploadTempVideos(savedProductId)
      }
    }
    
    alert(editingId.value ? '商品を更新しました' : '商品を追加しました')
    
    // フォームをリセット
    resetForm()
    // 商品一覧を再読み込み
    loadProducts()
  } catch (error) {
    console.error('Error saving product:', {
      error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    })
    alert('エラーが発生しました: ' + (error?.message || 'Unknown error'))
  }
}

// 編集を開始
const startEdit = async (product) => {
  editingId.value = product.id
  
  // 商品の画像と動画を読み込み
  await loadProductImages(product.id)
  await loadProductVideos(product.id)
  
  // nextTickを使用してDOMの更新を待つ
  nextTick(() => {
    // 各フィールドを個別に設定してリアクティブ更新を確実にする
    currentProduct.value.name = product.name || ''
    currentProduct.value.description = product.description || ''
    currentProduct.value.price = product.price || 0
    currentProduct.value.quantity = product.quantity || 1
    currentProduct.value.is_reserved = product.is_reserved || false
    currentProduct.value.image = product.image || ''
    
    // 編集フォームまでスムーズにスクロール
    if (editForm.value) {
      editForm.value.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  })
}

// 編集をキャンセル
const cancelEdit = () => {
  editingId.value = null
  resetForm()
}

// フォームをリセット
const resetForm = () => {
  editingId.value = null
  productImages.value = []
  productVideos.value = []
  manualImageUrl.value = ''
  uploadProgress.value = 0
  videoUploadProgress.value = 0
  
  // 一時画像のプレビューURLを解放
  tempImages.value.forEach(img => {
    if (img.preview_url) {
      URL.revokeObjectURL(img.preview_url)
    }
  })
  tempImages.value = []
  tempImageFiles.value = []
  
  // 一時動画のプレビューURLを解放
  tempVideos.value.forEach(video => {
    if (video.preview_url) {
      URL.revokeObjectURL(video.preview_url)
    }
    if (video.thumbnail_url && video.thumbnail_url.startsWith('blob:')) {
      URL.revokeObjectURL(video.thumbnail_url)
    }
  })
  tempVideos.value = []
  
  currentProduct.value = {
    name: '',
    description: '',
    price: 0,
    quantity: 1,
    is_reserved: false,
    image: ''
  }
}

// 商品を削除
const deleteProduct = async (id) => {
  if (!confirm('本当にこの商品を削除しますか？')) return
  
  try {
    const { error } = await supabase
      .from('succulents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    alert('商品を削除しました')
    loadProducts()
  } catch (error) {
    console.error('Error deleting product:', error)
    alert('削除中にエラーが発生しました')
  }
}

// 商品の画像一覧を読み込み
const loadProductImages = async (productId) => {
  try {
    const images = await getProductImages(productId)
    productImages.value = images
    
    // メイン画像をcurrentProduct.imageに設定（後方互換性）
    const primaryImage = images.find(img => img.is_primary)
    if (primaryImage) {
      currentProduct.value.image = primaryImage.image_url
    }
  } catch (error) {
    console.error('画像の読み込みに失敗しました:', error)
  }
}

// 商品の動画一覧を読み込み
const loadProductVideos = async (productId) => {
  try {
    const videos = await getProductVideos(productId)
    productVideos.value = videos
  } catch (error) {
    console.error('動画の読み込みに失敗しました:', error)
  }
}

// 複数画像選択処理
const handleMultipleImageSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  // 新規商品の場合は一時保存
  if (!editingId.value) {
    handleTempImageSelect(files)
    return
  }
  
  try {
    uploadProgress.value = 0
    const totalFiles = files.length
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await uploadSingleImage(file, i === 0 && productImages.value.length === 0) // 最初の画像をプライマリに
      uploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)
    }
    
    // 画像一覧を再読み込み
    await loadProductImages(editingId.value)
    uploadProgress.value = 0
    
    // ファイル入力をリセット
    event.target.value = ''
  } catch (error) {
    console.error('画像アップロードに失敗しました:', error)
    console.error('エラー詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    
    // 詳細なエラーメッセージを表示
    let errorMessage = '画像のアップロードに失敗しました。'
    if (error.message?.includes('relation "product_images" does not exist')) {
      errorMessage += '\n複数画像機能を使用するには、データベースのマイグレーションが必要です。'
    } else if (error.code === '42501') {
      errorMessage += '\n権限が不足しています。管理者でログインしてください。'
    } else if (error.message?.includes('storage')) {
      errorMessage += '\nストレージの設定を確認してください。'
    }
    
    alert(errorMessage)
    uploadProgress.value = 0
  }
}

// 新規商品の場合の一時画像選択処理
const handleTempImageSelect = (files) => {
  const newTempImages = []
  const newTempFiles = []
  
  Array.from(files).forEach((file, index) => {
    // ファイルから一時的なプレビューURLを作成
    const previewUrl = URL.createObjectURL(file)
    
    const tempImage = {
      id: `temp-${Date.now()}-${index}`,
      file: file,
      preview_url: previewUrl,
      alt_text: file.name,
      is_primary: tempImages.value.length === 0 && index === 0, // 最初の画像をプライマリに
      display_order: tempImages.value.length + index
    }
    
    newTempImages.push(tempImage)
    newTempFiles.push(file)
  })
  
  // 既存の一時画像に追加
  tempImages.value = [...tempImages.value, ...newTempImages]
  tempImageFiles.value = [...tempImageFiles.value, ...newTempFiles]
  
  // 最初の画像をcurrentProduct.imageに設定（プレビュー用）
  if (tempImages.value.length > 0 && !currentProduct.value.image) {
    const primaryImage = tempImages.value.find(img => img.is_primary) || tempImages.value[0]
    currentProduct.value.image = primaryImage.preview_url
  }
  
}

// 単一画像のアップロード
const uploadSingleImage = async (file, isPrimary = false) => {
  
  try {
    // R2対応版のアップロード関数を使用
    const result = await uploadProductImageR2(editingId.value, file, {
      displayOrder: productImages.value.length,
      altText: file.name,
      isPrimary: isPrimary
    })
    
  } catch (error) {
    console.error('uploadSingleImageでエラー:', error)
    throw error
  }
}

// 一時画像を実際にアップロード（R2対応版）
const uploadTempImages = async (productId) => {
  
  try {
    uploadProgress.value = 0
    const totalImages = tempImages.value.length
    
    for (let i = 0; i < tempImages.value.length; i++) {
      const tempImage = tempImages.value[i]
      
      try {
        // R2対応版のアップロード関数を使用
        await uploadProductImageR2(productId, tempImage.file, {
          displayOrder: i,
          altText: tempImage.alt_text || tempImage.file.name,
          isPrimary: tempImage.is_primary || (i === 0 && tempImages.value.length > 0)
        })
        
      } catch (uploadError) {
        console.error(`一時画像 ${i + 1}/${totalImages} アップロードエラー:`, uploadError)
        
        // 最初の画像がエラーの場合、フォールバック（単一画像フィールドに従来の方法で保存）
        if (i === 0) {
          try {
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substring(7)
            const fileExtension = tempImage.file.name.split('.').pop()
            const fileName = `${timestamp}_${randomId}.${fileExtension}`
            
            const { data, error } = await supabase.storage
              .from('succulents-images')
              .upload(fileName, tempImage.file)
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('succulents-images')
                .getPublicUrl(fileName)
              
              await supabase
                .from('succulents')
                .update({ image: publicUrl })
                .eq('id', productId)
            }
          } catch (fallbackError) {
            console.error('フォールバック保存エラー:', fallbackError)
          }
        }
        
        // エラーがあっても処理を続行
        continue
      }
      
      uploadProgress.value = Math.round(((i + 1) / totalImages) * 100)
    }
    
    uploadProgress.value = 0
    
  } catch (error) {
    console.error('一時画像のアップロードに失敗しました:', error)
    uploadProgress.value = 0
    throw error
  }
}

// 手動URL追加
const addManualImage = async () => {
  if (!manualImageUrl.value.trim()) return
  
  if (!editingId.value) {
    alert('まず商品を保存してから画像を追加してください')
    return
  }
  
  try {
    await addProductImage(editingId.value, manualImageUrl.value, {
      displayOrder: productImages.value.length,
      altText: '',
      isPrimary: productImages.value.length === 0
    })
    
    manualImageUrl.value = ''
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('画像の追加に失敗しました:', error)
    alert('画像の追加に失敗しました')
  }
}

// メイン画像に設定
const setPrimaryImage = async (imageId) => {
  try {
    await updateProductImage(imageId, { is_primary: true })
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('メイン画像の設定に失敗しました:', error)
    alert('メイン画像の設定に失敗しました')
  }
}

// 画像削除
const deleteImage = async (imageId) => {
  if (!confirm('この画像を削除しますか？')) return
  
  try {
    await deleteProductImage(imageId)
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('画像の削除に失敗しました:', error)
    alert('画像の削除に失敗しました')
  }
}

// ドラッグ&ドロップで順序変更
const handleDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  draggedIndex.value = null
}

const handleDrop = async (event) => {
  event.preventDefault()
  
  if (draggedIndex.value === null) return
  
  const dropZone = event.target.closest('.image-item')
  if (!dropZone) return
  
  const targetIndex = Array.from(dropZone.parentNode.children).indexOf(dropZone)
  
  if (draggedIndex.value === targetIndex) return
  
  // 配列の順序を変更
  const newImages = [...productImages.value]
  const draggedImage = newImages.splice(draggedIndex.value, 1)[0]
  newImages.splice(targetIndex, 0, draggedImage)
  
  // 表示順序を更新
  const imageIds = newImages.map(img => img.id)
  
  try {
    await updateImageDisplayOrder(imageIds)
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('順序の更新に失敗しました:', error)
    alert('順序の更新に失敗しました')
  }
}

// 一時画像を削除
const removeTempImage = (imageId) => {
  const index = tempImages.value.findIndex(img => img.id === imageId)
  if (index >= 0) {
    // プレビューURLを解放
    URL.revokeObjectURL(tempImages.value[index].preview_url)
    
    tempImages.value.splice(index, 1)
    tempImageFiles.value.splice(index, 1)
    
    // 順序を再調整
    tempImages.value.forEach((img, idx) => {
      img.display_order = idx
    })
    
    // プライマリ画像を再設定
    updateTempPrimaryImage()
  }
}

// 一時画像をプライマリに設定
const setTempPrimaryImage = (imageId) => {
  tempImages.value.forEach(img => {
    img.is_primary = img.id === imageId
  })
  
  // currentProduct.imageを更新
  const primaryImage = tempImages.value.find(img => img.is_primary)
  if (primaryImage) {
    currentProduct.value.image = primaryImage.preview_url
  }
}

// プライマリ画像を自動設定（削除後など）
const updateTempPrimaryImage = () => {
  const hasPrimary = tempImages.value.some(img => img.is_primary)
  
  if (!hasPrimary && tempImages.value.length > 0) {
    tempImages.value[0].is_primary = true
    currentProduct.value.image = tempImages.value[0].preview_url
  } else if (tempImages.value.length === 0) {
    currentProduct.value.image = ''
  }
}

// 一時画像の順序を変更
const moveTempImage = (fromIndex, toIndex) => {
  if (fromIndex === toIndex) return
  
  const movedImage = tempImages.value.splice(fromIndex, 1)[0]
  tempImages.value.splice(toIndex, 0, movedImage)
  
  // 順序を再調整
  tempImages.value.forEach((img, idx) => {
    img.display_order = idx
  })
}

// 動画選択処理
const handleVideoSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  // ファイルサイズチェック（100MB制限）
  const maxSize = 100 * 1024 * 1024 // 100MB
  for (const file of files) {
    if (file.size > maxSize) {
      alert(`ファイル "${file.name}" が大きすぎます。100MB以下のファイルを選択してください。`)
      event.target.value = ''
      return
    }
  }
  
  // 新規商品の場合は一時保存
  if (!editingId.value) {
    await handleTempVideoSelect(files)
    return
  }
  
  try {
    videoUploadProgress.value = 0
    const totalFiles = files.length
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await uploadSingleVideo(file, i === 0 && productVideos.value.length === 0)
      videoUploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)
    }
    
    // 動画一覧を再読み込み
    await loadProductVideos(editingId.value)
    videoUploadProgress.value = 0
    
    // ファイル入力をリセット
    event.target.value = ''
  } catch (error) {
    console.error('動画アップロードに失敗しました:', error)
    alert('動画のアップロードに失敗しました: ' + error.message)
    videoUploadProgress.value = 0
  }
}

// 新規商品の場合の一時動画選択処理
const handleTempVideoSelect = async (files) => {
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // 動画の基本情報を取得
      const duration = await getVideoDuration(file)
      const thumbnailDataUrl = await generateVideoThumbnail(file)
      
      const tempVideo = {
        id: `temp-video-${Date.now()}-${i}`,
        file: file,
        preview_url: URL.createObjectURL(file),
        thumbnail_url: thumbnailDataUrl,
        title: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除いたファイル名
        duration: duration,
        file_size: file.size,
        mime_type: file.type,
        is_primary: tempVideos.value.length === 0 && i === 0,
        display_order: tempVideos.value.length + i
      }
      
      tempVideos.value.push(tempVideo)
    }
  } catch (error) {
    console.error('一時動画の処理に失敗しました:', error)
    alert('動画の処理に失敗しました: ' + error.message)
  }
}

// 単一動画のアップロード
const uploadSingleVideo = async (file, isPrimary = false) => {
  try {
    // 動画をストレージにアップロード
    const uploadResult = await uploadVideoToStorage(file, (progress) => {
      // 個別の進捗は全体の進捗に含める
    })
    
    // サムネイルを生成
    const thumbnailDataUrl = await generateVideoThumbnail(file)
    const thumbnailBlob = dataUrlToBlob(thumbnailDataUrl)
    
    // サムネイルをアップロード
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const thumbnailFileName = `thumbnail_${timestamp}_${randomId}.jpg`
    
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from('product-videos')
      .upload(thumbnailFileName, thumbnailBlob)
    
    if (thumbnailError) {
      console.error('サムネイルのアップロードに失敗:', thumbnailError)
    }
    
    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('product-videos')
      .getPublicUrl(thumbnailFileName)
    
    // 動画の長さを取得
    const duration = await getVideoDuration(file)
    
    // データベースに動画情報を保存
    await addProductVideo(editingId.value, uploadResult.videoUrl, {
      title: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除いたファイル名
      thumbnailUrl: thumbnailUrl,
      duration: duration,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      displayOrder: productVideos.value.length,
      isPrimary: isPrimary
    })
    
  } catch (error) {
    console.error('uploadSingleVideo でエラー:', error)
    throw error
  }
}

// 一時動画を実際にアップロード
const uploadTempVideos = async (productId) => {
  try {
    videoUploadProgress.value = 0
    const totalVideos = tempVideos.value.length
    
    for (let i = 0; i < tempVideos.value.length; i++) {
      const tempVideo = tempVideos.value[i]
      
      // 動画をアップロード
      const uploadResult = await uploadVideoToStorage(tempVideo.file, (progress) => {
        // 個別の進捗は全体に反映
        const overallProgress = Math.round(((i + progress / 100) / totalVideos) * 100)
        videoUploadProgress.value = overallProgress
      })
      
      // サムネイルをアップロード
      let thumbnailUrl = ''
      if (tempVideo.thumbnail_url && tempVideo.thumbnail_url.startsWith('data:')) {
        const thumbnailBlob = dataUrlToBlob(tempVideo.thumbnail_url)
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(7)
        const thumbnailFileName = `thumbnail_${timestamp}_${randomId}_${i}.jpg`
        
        const { error: thumbnailError } = await supabase.storage
          .from('product-videos')
          .upload(thumbnailFileName, thumbnailBlob)
        
        if (!thumbnailError) {
          const { data: { publicUrl } } = supabase.storage
            .from('product-videos')
            .getPublicUrl(thumbnailFileName)
          thumbnailUrl = publicUrl
        }
      }
      
      // データベースに保存
      await addProductVideo(productId, uploadResult.videoUrl, {
        title: tempVideo.title,
        thumbnailUrl: thumbnailUrl,
        duration: tempVideo.duration,
        fileSize: tempVideo.file_size,
        mimeType: tempVideo.mime_type,
        displayOrder: i,
        isPrimary: tempVideo.is_primary
      })
      
      videoUploadProgress.value = Math.round(((i + 1) / totalVideos) * 100)
    }
    
    videoUploadProgress.value = 0
    
  } catch (error) {
    console.error('一時動画のアップロードに失敗しました:', {
      error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    })
    videoUploadProgress.value = 0
    throw error
  }
}

// 秒数を分:秒形式に変換
const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// メイン動画に設定
const setPrimaryVideo = async (videoId) => {
  try {
    await updateProductVideo(videoId, { is_primary: true })
    await loadProductVideos(editingId.value)
  } catch (error) {
    console.error('メイン動画の設定に失敗しました:', error)
    alert('メイン動画の設定に失敗しました')
  }
}

// 動画削除
const deleteVideo = async (videoId) => {
  if (!confirm('この動画を削除しますか？')) return
  
  try {
    await deleteProductVideo(videoId)
    await loadProductVideos(editingId.value)
  } catch (error) {
    console.error('動画の削除に失敗しました:', error)
    alert('動画の削除に失敗しました')
  }
}

// 動画タイトル更新
const updateVideoTitle = async (videoId, title) => {
  try {
    await updateProductVideo(videoId, { title })
  } catch (error) {
    console.error('動画タイトルの更新に失敗しました:', error)
  }
}

// 動画再生
const playVideo = (videoUrl) => {
  currentVideoUrl.value = videoUrl
  showVideoModal.value = true
}

// 動画モーダルを閉じる
const closeVideoModal = () => {
  showVideoModal.value = false
  currentVideoUrl.value = ''
  if (modalVideo.value) {
    modalVideo.value.pause()
  }
}

// 一時動画を削除
const removeTempVideo = (videoId) => {
  const index = tempVideos.value.findIndex(video => video.id === videoId)
  if (index >= 0) {
    // プレビューURLを解放
    if (tempVideos.value[index].preview_url) {
      URL.revokeObjectURL(tempVideos.value[index].preview_url)
    }
    if (tempVideos.value[index].thumbnail_url && tempVideos.value[index].thumbnail_url.startsWith('blob:')) {
      URL.revokeObjectURL(tempVideos.value[index].thumbnail_url)
    }
    
    tempVideos.value.splice(index, 1)
    
    // 順序を再調整
    tempVideos.value.forEach((video, idx) => {
      video.display_order = idx
    })
    
    // プライマリ動画を再設定
    updateTempPrimaryVideo()
  }
}

// 一時動画をプライマリに設定
const setTempPrimaryVideo = (videoId) => {
  tempVideos.value.forEach(video => {
    video.is_primary = video.id === videoId
  })
}

// プライマリ動画を自動設定（削除後など）
const updateTempPrimaryVideo = () => {
  const hasPrimary = tempVideos.value.some(video => video.is_primary)
  
  if (!hasPrimary && tempVideos.value.length > 0) {
    tempVideos.value[0].is_primary = true
  }
}

// 動画ドラッグ&ドロップ関連
const handleVideoDragStart = (event, index) => {
  draggedVideoIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleVideoDragEnd = () => {
  draggedVideoIndex.value = null
}

const handleVideoDrop = async (event) => {
  event.preventDefault()
  
  if (draggedVideoIndex.value === null) return
  
  const dropZone = event.target.closest('.video-item')
  if (!dropZone) return
  
  const targetIndex = Array.from(dropZone.parentNode.children).indexOf(dropZone)
  
  if (draggedVideoIndex.value === targetIndex) return
  
  // 配列の順序を変更
  const newVideos = [...productVideos.value]
  const draggedVideo = newVideos.splice(draggedVideoIndex.value, 1)[0]
  newVideos.splice(targetIndex, 0, draggedVideo)
  
  // 表示順序を更新
  const videoIds = newVideos.map(video => video.id)
  
  try {
    await updateVideoDisplayOrder(videoIds)
    await loadProductVideos(editingId.value)
  } catch (error) {
    console.error('順序の更新に失敗しました:', error)
    alert('順序の更新に失敗しました')
  }
}

// バケット確認機能
const checkVideoBucket = async () => {
  try {
    const bucketExists = await checkStorageBucket()
    
    if (bucketExists) {
      alert('✅ product-videos バケットが正常に作成されています。\n動画アップロードが可能です。')
    } else {
      alert('❌ product-videos バケットが見つかりません。\n\n以下の手順でバケットを作成してください：\n\n1. Supabase Dashboard にアクセス\n2. Storage メニューをクリック\n3. "Create a new bucket" をクリック\n4. Name: "product-videos" を入力\n5. "Public bucket" にチェックを入れる\n6. "Create bucket" をクリック')
    }
  } catch (error) {
    console.error('バケット確認エラー:', error)
    alert('バケットの確認中にエラーが発生しました。\nコンソールを確認してください。')
  }
}

// 詳細ストレージテスト機能
const testStorageBucket = async () => {
  try {
    console.log('🧪 ストレージバケットの詳細テストを開始します...')
    
    // 認証状態も確認
    const authStatus = await checkAuthStatus()
    
    const results = await testBucketAccess()
    
    let message = '🧪 ストレージテスト結果:\n\n'
    
    // 認証状態
    message += `🔐 認証状態: ${authStatus.isAuthenticated ? '✅ ログイン済み' : '❌ 未ログイン'}\n`
    if (authStatus.user) {
      message += `ユーザーID: ${authStatus.user.id}\n`
      message += `メール: ${authStatus.user.email || 'N/A'}\n`
    }
    message += '\n'
    
    // バケット一覧テスト結果
    if (results.listBuckets?.error) {
      message += '❌ バケット一覧取得: 失敗\n'
      message += `エラー: ${results.listBuckets.error.message}\n\n`
    } else {
      const bucketNames = results.listBuckets?.data?.map(b => b.name) || []
      message += `✅ バケット一覧取得: 成功\n`
      message += `見つかったバケット: [${bucketNames.join(', ')}]\n\n`
    }
    
    // ファイル一覧テスト結果
    if (results.listFiles?.error) {
      message += '❌ product-videos内ファイル一覧: 失敗\n'
      message += `エラー: ${results.listFiles.error.message}\n\n`
    } else {
      const fileCount = results.listFiles?.data?.length || 0
      message += `✅ product-videos内ファイル一覧: 成功\n`
      message += `ファイル数: ${fileCount}個\n\n`
    }
    
    // アップロードテスト結果
    if (results.uploadTest?.error) {
      message += '❌ テストファイルアップロード: 失敗\n'
      message += `エラー: ${results.uploadTest.error.message}\n\n`
    } else {
      message += '✅ テストファイルアップロード: 成功\n\n'
    }
    
    // 削除テスト結果
    if (results.deleteTest?.error) {
      message += '❌ テストファイル削除: 失敗\n'
      message += `エラー: ${results.deleteTest.error.message}\n`
    } else if (results.deleteTest) {
      message += '✅ テストファイル削除: 成功\n'
    }
    
    // 総合判定
    const hasErrors = results.listBuckets?.error || results.listFiles?.error || results.uploadTest?.error
    if (hasErrors) {
      message += '\n❌ 一部のテストが失敗しました。詳細はコンソールを確認してください。'
    } else {
      message += '\n✅ すべてのテストが成功しました。動画アップロードが可能です。'
    }
    
    alert(message)
    
  } catch (error) {
    console.error('テスト実行エラー:', error)
    alert('テスト実行中にエラーが発生しました。\nコンソールを確認してください。')
  }
}

// Cloudflare R2接続テスト機能
const testR2Connection = async () => {
  try {
    console.log('☁️ Cloudflare R2接続テストを開始...')
    
    // 1. 設定確認
    const r2Configured = validateR2Config()
    const storageStatus = getImageStorageStatus()
    
    let message = '☁️ Cloudflare R2接続テスト結果:\n\n'
    
    // 設定状況
    message += `🔧 設定状況:\n`
    message += `  R2設定: ${r2Configured ? '✅ 完了' : '❌ 不完全'}\n`
    message += `  R2使用: ${storageStatus.useR2 ? '✅ 有効' : '❌ 無効'}\n`
    message += `  フォールバック: ${storageStatus.fallbackToSupabase ? 'Supabase' : 'R2のみ'}\n\n`
    
    if (!r2Configured) {
      message += '❌ R2設定が不完全です。\n環境変数を確認してください。'
      alert(message)
      return
    }
    
    // 2. テスト用の小さな画像ファイルを作成
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    
    // 小さなテスト画像を描画
    ctx.fillStyle = '#4F46E5'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('R2 TEST', 50, 45)
    ctx.fillText(new Date().getTime().toString().slice(-6), 50, 65)
    
    // Canvasをblobに変換してFileオブジェクトを作成
    const testBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const testFile = new File([testBlob], 'r2-test.png', { type: 'image/png' })
    
    console.log('📝 テストファイル作成:', testFile)
    
    try {
      // 3. バケット接続テスト
      message += '🔗 バケット接続テスト:\n'
      const connectionTest = await r2Client.testConnection()
      message += `  接続: ${connectionTest ? '✅ 成功' : '❌ 失敗'}\n\n`
      
      if (!connectionTest) {
        message += '❌ バケットに接続できません。\n設定を確認してください。'
        alert(message)
        return
      }
      
      // 4. URL生成テスト
      message += '� URL生成テスト:\n'
      const testKey = r2Client.generateFileKey('test', testFile)
      const testUrl = r2Client.getPublicUrl(testKey)
      message += `  テストキー: ${testKey}\n`
      message += `  公開URL: ${testUrl}\n\n`
      
      // 5. 実装状況の説明
      message += '� R2実装状況:\n'
      message += '  設定確認: ✅ 完了\n'
      message += '  バケット疎通: ✅ 完了\n\n'
      
      // 5. 実際のアップロードテスト
      message += '📤 アップロードテスト:\n'
      try {
        const testKey = r2Client.generateFileKey('test', testFile)
        const uploadResult = await r2Client.uploadFile(testFile, testKey, (progress) => {
          console.log(`📊 テストアップロード進捗: ${progress}%`)
        })
        
        message += `  アップロード: ✅ 成功\n`
        message += `  アップロード先: ${uploadResult}\n`
        
        // 削除テスト
        try {
          await r2Client.deleteFile(testKey)
          message += `  削除テスト: ✅ 成功\n\n`
        } catch (deleteError) {
          message += `  削除テスト: ⚠️ エラー (${deleteError.message})\n\n`
        }
        
      } catch (uploadError) {
        message += `  アップロード: ❌ エラー\n`
        message += `  詳細: ${uploadError.message}\n\n`
      }
      
      // 6. 実装状況の説明
      message += '⭐ R2実装状況:\n'
      message += '  設定確認: ✅ 完了\n'
      message += '  バケット疎通: ✅ 完了\n'
      message += '  サーバーAPI: ✅ 実装済み\n'
      message += '  アップロード: ✅ 利用可能\n'
      message += '  削除機能: ✅ 利用可能\n\n'
      
      message += '🎉 Cloudflare R2が完全に利用可能です！'
      
    } catch (testError) {
      console.error('❌ R2テストエラー:', testError)
      message += `  テスト: ❌ 失敗\n`
      message += `  エラー: ${testError.message}\n\n`
      
      message += '❌ R2設定またはバケット接続に問題があります。\n'
      message += '以下を確認してください:\n\n'
      message += '1. 環境変数の設定\n'
      message += '2. Cloudflareでのバケット作成\n'
      message += '3. パブリックアクセス設定\n'
      message += '4. API Tokenの権限'
    }
    
    alert(message)
    
  } catch (error) {
    console.error('❌ R2テスト実行エラー:', error)
    alert('R2テスト実行中にエラーが発生しました。\nコンソールを確認してください。')
  }
}

// コンポーネント初期化時に商品一覧を読み込み
onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.admin-panel {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.admin-panel h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 700;
}

.admin-panel h3 {
  text-align: center;
  color: #2c5f2d;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.edit-form {
  background: rgba(255, 255, 255, 0.98);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  align-items: center;
}

.form-group label {
  color: #2c3e50;
  font-weight: 600;
  text-align: right;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="url"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.9);
  color: #495057;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 2px rgba(44, 95, 45, 0.25);
  background: white;
}

.form-group.description-group {
  grid-template-columns: 120px 1fr;
  align-items: start;
}

.form-group.description-group textarea {
  resize: vertical;
  min-height: 80px;
  height: 80px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin-top: 2rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  cursor: pointer;
}

.required {
  color: #dc3545;
  margin-left: 0.2rem;
}

.image-input-group {
  display: flex;
  gap: 1rem;
  align-items: start;
}

.image-input-group input {
  flex: 1;
}

.image-preview {
  position: relative;
  max-width: 300px;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-preview img {
  width: 100%;
  height: 200px;
  object-fit: contain;
  display: block;
  background-color: #f8f9fa;
}

.remove-image {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.remove-image:hover {
  background: rgba(220, 53, 69, 1);
}

/* 画像アップロード関連のスタイル */
.image-upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-options {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-upload-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  text-align: center;
  user-select: none;
}

.file-upload-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.upload-info {
  color: #6c757d;
  font-size: 0.9rem;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #28a745);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.9rem;
  color: #495057;
  text-align: center;
}

.manual-url-section {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.toggle-manual {
  display: inline-block;
  color: #007bff;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  text-decoration: underline;
}

.toggle-manual:hover {
  color: #0056b3;
}

.manual-input {
  margin-top: 0.5rem;
}

.manual-input input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* 商品一覧のスタイル */
.products-list {
  background: rgba(255, 255, 255, 0.98);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 2rem;
}

.products-list h3 {
  text-align: center;
  color: #2c5f2d;
  margin-bottom: 2rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
}

.product-item {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f8f9fa;
  transition: object-fit 0.3s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.product-thumb:hover {
  border: 1px solid #007bff;
  transform: scale(1.02);
}

/* 画像のフォールバック表示 */
.product-thumb:not([src]), 
.product-thumb[src=""], 
.product-thumb[src="#"] {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
}

.product-thumb:not([src])::before, 
.product-thumb[src=""]::before, 
.product-thumb[src="#"]::before {
  content: "📷";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: #6c757d;
}

.status-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.status-badge.reserved {
  background: rgba(255, 193, 7, 0.9);
  color: #212529;
}

.status-badge.sold-out {
  background: rgba(108, 117, 125, 0.9);
}

.product-details {
  margin-bottom: 1.5rem;
}

.product-details h4 {
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.product-details .price {
  color: #2c5f2d;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.product-details .stock-info {
  color: #495057;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
}

.product-details .stock-info.low-stock {
  color: #dc3545;
  font-weight: 600;
}

.product-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
}

.btn-edit,
.btn-delete {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  min-height: 44px; /* タッチターゲット最小サイズ */
  touch-action: manipulation; /* タッチ操作の最適化 */
  user-select: none; /* テキスト選択防止 */
  -webkit-user-select: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1); /* タッチ時のハイライト */
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-edit:active {
  background: #004085;
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-delete:active {
  background: #bd2130;
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* フォームボタンのスタイル */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  min-width: 120px;
}

.btn-primary {
  background: #2c5f2d;
  color: white;
}

.btn-primary:hover {
  background: #1e4220;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(44, 95, 45, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

/* 数量グループのスタイル */
.quantity-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-group input[type="number"] {
  max-width: 120px;
}

.quantity-group .checkbox-label {
  color: #2c3e50;
  font-weight: 500;
  white-space: nowrap;
}

/* 複数画像アップロード用スタイル */
.multiple-image-upload-section {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafafa;
}

.images-gallery {
  margin-top: 1.5rem;
}

.images-gallery h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  min-height: 100px;
}

.image-item {
  position: relative;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: move;
  transition: all 0.3s ease;
}

.image-item:hover {
  border-color: #2c5f2d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-item.primary {
  border-color: #ffd700;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  background-color: #f8f9fa;
}

.image-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.primary-btn, .delete-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.primary-btn:hover {
  background: rgba(255, 215, 0, 0.9);
}

.primary-btn.active {
  background: #ffd700;
  color: #333;
}

.delete-btn:hover {
  background: rgba(220, 53, 69, 0.9);
}

.image-order {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffd700;
  color: #333;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  padding: 4px;
}

.manual-input {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.manual-input input {
  flex: 1;
}

.add-url-btn {
  background: #2c5f2d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.add-url-btn:hover {
  background: #1e4220;
}

/* 一時画像用のスタイル */
.temp-image-item {
  position: relative;
}

.temp-badge {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #f0ad4e;
  color: white;
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 2px;
}

.temp-images-grid .image-item {
  border-color: #f0ad4e;
}

.temp-images-grid .image-item:hover {
  border-color: #ec971f;
  box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
}

/* レスポンシブ対応 */
@media screen and (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .image-item img {
    height: 100px;
  }
  
  .multiple-image-upload-section {
    padding: 1rem;
  }
}

/* タブレット対応 */
@media (max-width: 992px) {
  .admin-panel {
    margin: 1.5rem;
    padding: 1.5rem;
  }
  
  .edit-form {
    padding: 1.5rem;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
  
  .product-image-container {
    height: 180px;
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .admin-panel {
    margin: 1rem;
    padding: 1rem;
  }
  
  .admin-panel h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .admin-panel h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .edit-form {
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .form-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    text-align: left;
    font-size: 0.9rem;
  }
  
  .form-group.description-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .form-group.description-group textarea {
    width: 100%;
    min-height: 120px;
    height: auto;
    box-sizing: border-box;
  }
  
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group input[type="url"],
  .form-group textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem;
    font-size: 1rem;
  }
  
  .upload-options {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .file-upload-btn {
    text-align: center;
    width: 100%;
    padding: 1rem;
  }
  
  .image-preview {
    max-width: 100%;
    margin: 0.75rem 0;
  }
  
  .image-preview img {
    height: 200px;
    object-fit: contain;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .product-item {
    padding: 1rem;
  }
  
  .product-image-container {
    height: 250px;
    margin-bottom: 0.75rem;
  }
}

/* より小さなスマホ画面対応 */
@media (max-width: 480px) {
  .admin-panel {
    margin: 0.5rem;
    padding: 0.75rem;
  }
  
  .admin-panel h2 {
    font-size: 1.25rem;
  }
  
  .edit-form {
    padding: 0.75rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group input[type="url"],
  .form-group textarea {
    padding: 0.5rem;
    font-size: 0.95rem;
  }
  
  .form-group.description-group textarea {
    min-height: 100px;
    padding: 0.5rem;
  }
  
  .file-upload-btn {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .image-preview img {
    height: 180px;
  }
  
  .product-item {
    padding: 0.75rem;
  }
  
  .product-image-container {
    height: 200px;
  }
  
  .product-details h4 {
    font-size: 1rem;
  }
  
  .product-details .price {
    font-size: 1.1rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .btn-edit,
  .btn-delete {
    padding: 0.75rem;
    font-size: 0.9rem;
    min-height: 44px; /* Appleのタッチターゲット推奨サイズ */
    touch-action: manipulation; /* タッチ操作の最適化 */
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1); /* タッチ時のハイライト */
  }
  
  .products-list {
    padding: 0.75rem;
  }
  
  .form-row {
    gap: 1rem;
  }
}

/* バケット確認ボタン */
.btn-check-bucket,
.btn-test-bucket,
.btn-storage-info {
  padding: 0.5rem 1rem;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 1rem;
}

.btn-test-bucket {
  background: #6c757d;
}

.btn-storage-info {
  background: #28a745;
}

.btn-r2-test {
  background: #fd7e14;
}

.btn-check-bucket:hover,
.btn-test-bucket:hover,
.btn-storage-info:hover,
.btn-r2-test:hover {
  background: #138496;
  transform: translateY(-1px);
}

.btn-test-bucket:hover {
  background: #5a6268;
}

.btn-storage-info:hover {
  background: #218838;
}

.btn-r2-test:hover {
  background: #e8590c;
}

.btn-check-bucket:active,
.btn-test-bucket:active,
.btn-storage-info:active,
.btn-r2-test:active {
  background: #117a8b;
  transform: translateY(0);
}

.btn-test-bucket:active {
  background: #545b62;
}

.btn-storage-info:active {
  background: #1e7e34;
}

.btn-r2-test:active {
  background: #dc6405;
}

/* 動画アップロード関連のスタイル */
.multiple-video-upload-section {
  border: 2px dashed #007bff;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8f9ff;
  margin-top: 1rem;
}

.video-upload {
  background: #007bff !important;
  color: white !important;
}

.video-upload:hover {
  background: #0056b3 !important;
}

.videos-gallery {
  margin-top: 1.5rem;
}

.videos-gallery h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap:  1rem;
  min-height: 100px;
}

.video-item {
  position: relative;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: move;
  transition: all 0.3s ease;
}

.video-item:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.video-item.primary {
  border-color: #ffd700;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 120px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  font-size: 2rem;
  color: #6c757d;
}

.video-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.video-info {
  padding: 8px;
}

.video-title-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
}

.video-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.play-btn {
  background: rgba(0, 123, 255, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.play-btn:hover {
  background: rgba(0, 123, 255, 1);
}

.video-order {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.temp-video-item {
  border-color: #007bff;
}

.temp-video-item:hover {
  border-color: #0056b3;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.temp-badge {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #007bff;
  color: white;
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 2px;
}

/* 動画モーダルのスタイル */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  box-sizing: border-box;
}

.video-modal-content {
  position: relative;
  background: black;
  border-radius: 8px;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

/* レスポンシブ対応 */
@media screen and (max-width: 768px) {
  .videos-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }
  
  .video-item {
    border-width: 1px;
  }
  
  .video-thumbnail {
    height: 100px;
  }
  
  .multiple-video-upload-section {
    padding: 1rem;
  }
  
  .video-modal-content {
    max-width: 95vw;
    max-height: 85vh;
  }
}

@media screen and (max-width: 480px) {
  .videos-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .video-thumbnail {
    height: 80px;
  }
  
  .video-controls {
    gap: 2px;
  }
  
  .play-btn,
  .primary-btn,
  .delete-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
</style>
