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

          <!-- 動画なしメッセージ -->
          <div v-if="editingId && productVideos.length === 0" style="padding: 1rem; background: #f8f9fa; border-radius: 4px; text-align: center; color: #6c757d;">
            この商品には動画が登録されていません。上の「動画を追加」ボタンから動画をアップロードできます。
          </div>
          
          <!-- 既存動画一覧 -->
          <div v-if="editingId && productVideos.length > 0" class="videos-gallery">
            <h4>登録済み動画（ドラッグ&ドロップで順序変更）- {{ productVideos.length }}件</h4>
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
                  <img 
                    v-if="video.thumbnail_url" 
                    :src="getPublicImageUrl(video.thumbnail_url)" 
                    :alt="video.title || `動画 ${index + 1}`"
                    class="video-thumbnail-img"
                  >
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
            <!-- 動画がある場合はサムネイルを全面表示（サムネイルURLがなくても動画アイコンを表示） -->
            <div v-if="product.videos && product.videos.length > 0" 
                 class="video-thumbnail-main" 
                 @click="playVideoFromList(product, product.videos[0])" 
                 title="動画を再生">
              <img 
                v-if="product.videos[0].thumbnail_url"
                :src="product.videos[0].thumbnail_url" 
                :alt="`${product.name} 動画サムネイル`"
                class="product-thumb video-thumbnail-image"
                @error="(e) => e.target.style.display = 'none'"
              >
              <!-- サムネイル読み込みエラー時またはURLがない場合のフォールバック -->
              <div class="video-icon-fallback">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="white">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              </div>
              <!-- 再生アイコンオーバーレイ -->
              <div class="play-icon-overlay-main">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <!-- 動画カウント（複数動画がある場合） -->
              <span v-if="product.videos.length > 1" class="video-count-badge">{{ product.videos.length }}本</span>
            </div>
            
            <!-- 動画がない場合は従来通りの画像表示 -->
            <template v-else>
              <!-- 複数画像の場合はSwiper表示 -->
              <div v-if="product.images && product.images.length > 1" class="product-swiper-container">
                <div class="swiper product-swiper" :data-product-id="product.id">
                  <div class="swiper-wrapper">
                    <div 
                      v-for="(image, index) in product.images" 
                      :key="image.id || index"
                      class="swiper-slide"
                    >
                      <img 
                        :src="getPublicImageUrl(image.image_url)" 
                        :alt="`${product.name} ${index + 1}`"
                        class="product-image"
                        @error="handleImageError"
                      >
                    </div>
                  </div>
                  <!-- ナビゲーション矢印 -->
                  <div class="swiper-button-next product-swiper-next"></div>
                  <div class="swiper-button-prev product-swiper-prev"></div>
                  <!-- ページネーション -->
                  <div class="swiper-pagination product-swiper-pagination"></div>
                </div>
              </div>
              <!-- 単一画像の場合 -->
              <div v-else class="single-image-container">
                <img :src="product.image" :alt="product.name" class="product-image" @error="handleImageError">
              </div>
            </template>
            
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

    <!-- R2動画再生モーダル -->
    <Teleport to="body">
      <div v-if="showVideoModal" class="video-modal" @click="closeVideoModal">
        <div class="video-content" @click.stop>
          <button class="modal-close" @click="closeVideoModal">&times;</button>
          <R2VideoPlayer 
            v-if="currentVideoUrl"
            :video-url="currentVideoUrl"
            :autoplay="true"
            @close="closeVideoModal"
          />
        </div>
      </div>
    </Teleport>
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
import getPublicImageUrl from '../lib/imageUtils.js'
// Swiperのインポート
import { Swiper } from 'swiper'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
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
  getVideoDuration
} from '../lib/productVideos'
import R2VideoPlayer from './R2VideoPlayer.vue'

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

// 画像エラーハンドラー
const handleImageError = (event) => {
  console.error('画像読み込みエラー:', event.target.src)
  event.target.style.display = 'none'
}

// 商品一覧を取得
const loadProducts = async () => {
  
  try {
    const { data, error } = await supabase
      .from('succulents')
      .select('id, name, description, price, quantity, is_reserved, image')
      .order('id', { ascending: true })
    
    if (error) {
      console.error('❌ 商品読み込みエラー:', error)
      return
    }
    
    // 各商品に対してproduct_imagesテーブルから画像と動画を取得
    const productsWithImages = await Promise.all(
      (data || []).map(async (product) => {
        try {
          // product_imagesテーブルから画像を取得
          const { data: productImages, error: imageError } = await supabase
            .from('product_images')
            .select('image_url, is_primary, display_order')
            .eq('product_id', product.id)
            .order('display_order', { ascending: true })
          
          // product_videosテーブルから動画を取得
          const { data: productVideos, error: videoError } = await supabase
            .from('product_videos')
            .select('*')
            .eq('product_id', product.id)
            .order('display_order', { ascending: true })
          
          if (videoError) {
            console.error('❌ 動画取得エラー:', videoError)
          }
          
          let displayImage = product.image // デフォルトはsucculents.image
          let images = [] // 画像配列
          
          if (!imageError && productImages && productImages.length > 0) {
            // プライマリ画像があればそれを使用、なければ最初の画像
            const primaryImage = productImages.find(img => img.is_primary) || productImages[0]
            displayImage = getPublicImageUrl(primaryImage.image_url)
            // 画像配列を保存（URLを変換）
            images = productImages.map(img => ({
              ...img,
              image_url: getPublicImageUrl(img.image_url)
            }))
          } else {
            // product_imagesになければ、succulents.imageを使用
            if (product.image) {
              displayImage = getPublicImageUrl(product.image)
              // 単一画像の場合も配列形式で保存
              images = [{
                image_url: getPublicImageUrl(product.image),
                is_primary: true,
                display_order: 0
              }]
            }
          }
          
          return {
            ...product,
            image: displayImage, // 表示用の画像URL
            images: images, // 画像配列（Swiper用）
            videos: productVideos && productVideos.length > 0 ? productVideos.map(video => ({
              ...video,
              video_url: getPublicImageUrl(video.video_url),
              thumbnail_url: video.thumbnail_url ? getPublicImageUrl(video.thumbnail_url) : null
            })) : []
          }
        } catch (err) {
          console.error(`❌ 商品 ${product.name} の画像・動画取得エラー:`, err)
          return product
        }
      })
    )
    
    products.value = productsWithImages
    
    // DOM更新後にSwiperを初期化
    await nextTick()
    initProductSwipers()
    
  } catch (error) {
    console.error('❌ 商品読み込み時にエラーが発生しました:', error)
    products.value = []
  }
}

// 商品一覧のSwiper初期化
const initProductSwipers = () => {
  console.log('[Admin] Starting Swiper initialization for all products')
  products.value.forEach((product) => {
    console.log(`[Admin] Checking product ${product.id}, images:`, product.images)
    if (product.images && product.images.length > 1) {
      const swiperEl = document.querySelector(`.product-swiper[data-product-id="${product.id}"]`)
      console.log(`[Admin] Swiper element found for product ${product.id}:`, swiperEl)
      if (swiperEl) {
        // 既存のSwiperインスタンスを破棄
        if (swiperEl.swiper) {
          console.log(`[Admin] Destroying existing Swiper for product ${product.id}`)
          swiperEl.swiper.destroy(true, true)
        }
        
        console.log(`[Admin] Initializing new Swiper for product ${product.id}`)
        
        // 画像の読み込みを待つ
        const images = swiperEl.querySelectorAll('img')
        console.log(`[Admin] Found ${images.length} images in swiper for product ${product.id}`)
        images.forEach((img, index) => {
          console.log(`[Admin] Image ${index} src:`, img.src)
        })
        
        const imagePromises = Array.from(images).map((img, index) => {
          if (img.complete) {
            console.log(`[Admin] Image ${index} already loaded for product ${product.id}`)
            return Promise.resolve()
          }
          return new Promise(resolve => {
            const originalSrc = img.src
            console.log(`[Admin] Waiting for image ${index} to load for product ${product.id}: ${originalSrc}`)
            
            img.onload = () => {
              console.log(`[Admin] Image ${index} loaded successfully for product ${product.id}`)
              resolve()
            }
            img.onerror = () => {
              console.warn(`[Admin] Image ${index} failed to load for product ${product.id}: ${originalSrc}`)
              resolve() // 失敗してもSwiper初期化は続行
            }
          })
        })
        
        Promise.all(imagePromises).then(() => {
          // ナビゲーションボタンの存在を確認
          const nextEl = swiperEl.querySelector('.product-swiper-next')
          const prevEl = swiperEl.querySelector('.product-swiper-prev')
          const paginationEl = swiperEl.querySelector('.product-swiper-pagination')
          
          console.log(`[Admin] Navigation elements for product ${product.id}:`, { nextEl, prevEl, paginationEl })
          
          const swiperInstance = new Swiper(swiperEl, {
            modules: [Navigation, Pagination],
            slidesPerView: 1,
            loop: product.images.length > 2, // 3枚以上の場合のみループ
            navigation: {
              nextEl: nextEl,
              prevEl: prevEl,
            },
            pagination: {
              el: paginationEl,
              clickable: true,
            },
            touchRatio: 1,
            simulateTouch: true,
            grabCursor: true,
            // Swiperの自動高さ調整
            autoHeight: false,
            // スライド切り替え時の処理
            on: {
              init: function() {
                console.log(`[Admin] Swiper initialized for product ${product.id}, slides count: ${this.slides.length}`)
                // 初期化後に画像の可視性を確認・修正
                this.slides.forEach((slide, index) => {
                  const img = slide.querySelector('img')
                  if (img) {
                    img.style.display = 'block'
                    img.style.visibility = 'visible'
                    img.style.opacity = '1'
                    console.log(`[Admin] Image ${index} visibility reset for product ${product.id}`)
                  }
                })
                this.update()
              },
              slideChange: function() {
                console.log(`[Admin] Slide changed for product ${product.id}, current index: ${this.activeIndex}, real index: ${this.realIndex}`)
                // スライド変更時に現在の画像の可視性を確認・修正
                const activeSlide = this.slides[this.activeIndex]
                if (activeSlide) {
                  const img = activeSlide.querySelector('img')
                  if (img) {
                    img.style.display = 'block'
                    img.style.visibility = 'visible'
                    img.style.opacity = '1'
                    console.log(`[Admin] Active slide image visibility reset for product ${product.id}`)
                  }
                }
                this.update()
              }
            }
          })
          
          console.log(`[Admin] Swiper instance created for product ${product.id}:`, swiperInstance)
          
          // 初期化後に強制的にupdate
          setTimeout(() => {
            swiperInstance.update()
            console.log(`[Admin] Forced update executed for product ${product.id}`)
          }, 100)
        }).catch(error => {
          console.error(`[Admin] Error initializing Swiper for product ${product.id}:`, error)
        })
      }
    }
  })
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
        try {
          const uploadedImages = await uploadTempImages(savedProductId)
          
          // プライマリ画像をsucculents.imageにも保存
          if (uploadedImages && uploadedImages.length > 0) {
            const primaryImage = uploadedImages.find(img => img.is_primary) || uploadedImages[0]
            if (primaryImage && primaryImage.image_url) {
              await supabase
                .from('succulents')
                .update({ image: primaryImage.image_url })
                .eq('id', savedProductId)
            }
          }
        } catch (imageError) {
          console.error('❌ 画像アップロードエラー:', imageError)
          alert(`画像のアップロードに失敗しました:\n\n${imageError.message}\n\n商品は保存されましたが、画像は保存されませんでした。`)
        }
      }
      
      if (tempVideos.value.length > 0) {
        try {
          await uploadTempVideos(savedProductId)
        } catch (videoError) {
          console.error('❌ 動画アップロードエラー:', videoError)
          alert(`動画のアップロードに失敗しました:\n\n${videoError.message}\n\n商品は保存されましたが、動画は保存されませんでした。\n\n後で商品を編集して動画を追加してください。`)
        }
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
  
  // 一時データをクリア
  tempImages.value.forEach(img => {
    if (img.preview_url) {
      URL.revokeObjectURL(img.preview_url)
    }
  })
  tempImages.value = []
  tempImageFiles.value = []
  
  tempVideos.value.forEach(video => {
    if (video.preview_url) {
      URL.revokeObjectURL(video.preview_url)
    }
    if (video.thumbnail_url && video.thumbnail_url.startsWith('blob:')) {
      URL.revokeObjectURL(video.thumbnail_url)
    }
  })
  tempVideos.value = []
  
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
    
    return result
    
  } catch (error) {
    console.error('❌ uploadSingleImageでエラー:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw error
  }
}

// 一時画像を実際にアップロード（R2対応版）
const uploadTempImages = async (productId) => {
  try {
    uploadProgress.value = 0
    const totalImages = tempImages.value.length
    const uploadedImages = [] // アップロードした画像情報を保存
    
    for (let i = 0; i < tempImages.value.length; i++) {
      const tempImage = tempImages.value[i]
      
      try {
        // R2対応版のアップロード関数を使用
        const result = await uploadProductImageR2(productId, tempImage.file, {
          displayOrder: i,
          altText: tempImage.alt_text || tempImage.file.name,
          isPrimary: tempImage.is_primary || (i === 0 && tempImages.value.length > 0)
        })
        
        // アップロード成功した画像を配列に追加
        if (result) {
          uploadedImages.push(result)
        }
        
      } catch (uploadError) {
        console.error(`❌ 一時画像 ${i + 1}/${totalImages} アップロードエラー:`, {
          error: uploadError,
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint,
          code: uploadError.code
        })
        
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
    
    // アップロードした画像情報を返す
    return uploadedImages
    
  } catch (error) {
    console.error('❌ 一時画像のアップロードに失敗しました:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      stack: error.stack
    })
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
  
  // ファイルサイズチェック（200MB制限）
  const maxSize = 200 * 1024 * 1024 // 200MB
  for (const file of files) {
    if (file.size > maxSize) {
      alert(`ファイル "${file.name}" が大きすぎます。\n\n最大サイズ: 200MB\n実際のサイズ: ${Math.round(file.size / 1024 / 1024)}MB\n\nより小さいファイルを選択してください。`)
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
      console.log(`📤 動画アップロード開始 (${i + 1}/${totalFiles}):`, file.name)
      await uploadSingleVideo(file, i === 0 && productVideos.value.length === 0)
      videoUploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)
      console.log(`✅ 動画アップロード完了 (${i + 1}/${totalFiles})`)
    }
    
    // 動画一覧を再読み込み
    await loadProductVideos(editingId.value)
    videoUploadProgress.value = 0
    
    // ファイル入力をリセット
    event.target.value = ''
    
    alert(`${totalFiles}件の動画をアップロードしました！`)
  } catch (error) {
    console.error('❌ 動画アップロードに失敗しました:', error)
    alert('動画のアップロードに失敗しました:\n\n' + error.message)
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
    console.log('📤 uploadSingleVideo開始:', file.name)
    
    // 動画をストレージにアップロード
    const uploadResult = await uploadVideoToStorage(file, (progress) => {
      // 個別の進捗は全体の進捗に含める
    })
    
    console.log('📥 uploadResult:', uploadResult)
    console.log('📥 videoUrl:', uploadResult?.videoUrl)
    
    // アップロード結果の検証
    if (!uploadResult || !uploadResult.videoUrl) {
      throw new Error('動画のアップロードに失敗しました。動画URLが取得できませんでした。')
    }
    // R2のURLであることを明示的にチェック（r2.dev または r2.cloudflarestorage.com）
    if (!uploadResult.videoUrl.includes('r2.dev') && !uploadResult.videoUrl.includes('r2.cloudflarestorage.com')) {
      console.error('❌ 不正なURL形式:', uploadResult.videoUrl)
      throw new Error('R2の動画URLが取得できませんでした。環境変数CLOUDFLARE_R2_PUBLIC_URLを確認してください。')
    }
    
    // サムネイルを生成
    const thumbnailDataUrl = await generateVideoThumbnail(file)
    const thumbnailBlob = dataUrlToBlob(thumbnailDataUrl)
    
    // サムネイルをR2にアップロード
    let thumbnailUrl = ''
    try {
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const thumbnailFile = new File([thumbnailBlob], `thumb_${timestamp}_${randomId}.jpg`, { type: 'image/jpeg' })
      
      const formData = new FormData()
      formData.append('file', thumbnailFile)
      formData.append('type', 'thumbnail')
      
      const uploadResponse = await fetch('/api/r2-upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`サムネイルアップロード失敗: ${uploadResponse.statusText}`)
      }
      
      const uploadData = await uploadResponse.json()
      thumbnailUrl = uploadData.url
    } catch (thumbnailError) {
      console.error('サムネイルのアップロードに失敗:', thumbnailError)
      // サムネイルがなくても動画は保存する
    }
    
    // 動画の長さを取得
    const duration = await getVideoDuration(file)
    
    // データベースに動画情報を保存（R2キーも保存）
    await addProductVideo(editingId.value, uploadResult.videoUrl, {
      title: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除いたファイル名
      thumbnailUrl: thumbnailUrl,
      duration: duration,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      displayOrder: productVideos.value.length,
      isPrimary: isPrimary,
      r2VideoKey: uploadResult.r2Key,  // R2キーを保存
      r2ThumbnailKey: null  // サムネイルはまだR2に保存していない
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
      
      try {
        // 動画をアップロード
        const uploadResult = await uploadVideoToStorage(tempVideo.file, (progress) => {
          // 個別の進捗は全体に反映
          const overallProgress = Math.round(((i + progress / 100) / totalVideos) * 100)
          videoUploadProgress.value = overallProgress
        })
        
        // アップロード結果の検証
        if (!uploadResult || !uploadResult.videoUrl) {
          throw new Error('動画URLが取得できませんでした')
        }
        
        // サムネイルをアップロード
        let thumbnailUrl = ''
        if (tempVideo.thumbnail_url && tempVideo.thumbnail_url.startsWith('data:')) {
          try {
            const thumbnailBlob = dataUrlToBlob(tempVideo.thumbnail_url)
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substring(7)
            
            // R2にサムネイルをアップロード
            const thumbnailFile = new File([thumbnailBlob], `thumb_${timestamp}_${randomId}.jpg`, { type: 'image/jpeg' })
            const formData = new FormData()
            formData.append('file', thumbnailFile)
            formData.append('type', 'thumbnail')
            
            const uploadResponse = await fetch('/api/r2-upload', {
              method: 'POST',
              body: formData
            })
            
            if (!uploadResponse.ok) {
              throw new Error(`サムネイルアップロード失敗: ${uploadResponse.statusText}`)
            }
            
            const uploadData = await uploadResponse.json()
            thumbnailUrl = uploadData.url
          } catch (thumbnailError) {
            console.error('⚠️ サムネイルのアップロード失敗:', thumbnailError)
            // サムネイルがなくても動画は保存する
          }
        }
        
        // データベースに保存（R2キーも保存）
        const savedVideo = await addProductVideo(productId, uploadResult.videoUrl, {
          title: tempVideo.title,
          thumbnailUrl: thumbnailUrl,
          duration: tempVideo.duration,
          fileSize: tempVideo.file_size,
          mimeType: tempVideo.mime_type,
          displayOrder: i,
          isPrimary: tempVideo.is_primary,
          r2VideoKey: uploadResult.r2Key,  // R2キーを保存
          r2ThumbnailKey: null
        })
        
        videoUploadProgress.value = Math.round(((i + 1) / totalVideos) * 100)
        
      } catch (videoError) {
        console.error(`❌ 動画 ${i + 1}/${totalVideos} のアップロード失敗:`, videoError)
        videoUploadProgress.value = 0
        // 個別の動画のエラーを上位に伝える
        throw new Error(`動画「${tempVideo.title}」のアップロードに失敗: ${videoError.message}`)
      }
    }
    
    videoUploadProgress.value = 0
    
  } catch (error) {
    console.error('❌ 一時動画のアップロードに失敗しました:', error)
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
  if (!confirm('この動画を削除しますか？\n\n※ R2ストレージからも物理的に削除されます。')) return
  
  try {
    await deleteProductVideo(videoId)
    
    // 動画一覧を再読み込み
    await loadProductVideos(editingId.value)
    
    // 成功メッセージ
    alert('動画とR2ストレージから削除しました')
  } catch (error) {
    alert('動画の削除に失敗しました:\n\n' + error.message)
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
  
  // スクロールとスワイプを完全に無効化
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.touchAction = 'none'
  document.documentElement.style.overflow = 'hidden'
}

// 商品一覧からの動画再生
const playVideoFromList = (product, video) => {
  currentVideoUrl.value = video.video_url || video
  showVideoModal.value = true
  
  // スクロールとスワイプを完全に無効化
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.touchAction = 'none'
  document.documentElement.style.overflow = 'hidden'
}

// 動画モーダルを閉じる
const closeVideoModal = () => {
  showVideoModal.value = false
  currentVideoUrl.value = ''
  
  // スクロールとスワイプの制限を解除
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
  document.body.style.touchAction = ''
  document.documentElement.style.overflow = ''
  
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

// R2動画再生のエラーハンドリング
const onVideoPlaybackError = (error) => {
  console.error('❌ R2動画再生エラー:', error)
  alert(`R2動画の再生でエラーが発生しました:\n${error.error || 'Unknown error'}`)
}

const onVideoCanPlay = () => {
  // 動画再生準備完了
}

const onVideoLoadStart = () => {
  // 動画読み込み開始
}

// 動画URLをテストする関数
const testVideoUrl = async () => {
  if (!currentVideoUrl.value) {
    alert('テストする動画URLがありません')
    return
  }
  
  try {
    // HEADリクエストで動画の存在確認
    const response = await fetch(currentVideoUrl.value, { method: 'HEAD' })
    
    const testResult = {
      url: currentVideoUrl.value,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      isR2Url: currentVideoUrl.value.includes('.r2.dev'),
      exists: response.ok
    }
    
    if (response.ok) {
      const sizeInfo = testResult.contentLength 
        ? `\nファイルサイズ: ${(testResult.contentLength / 1024 / 1024).toFixed(2)} MB`
        : ''
        
      alert(`✅ R2動画URL接続テスト成功\n\nステータス: ${testResult.status} ${testResult.statusText}\nContent-Type: ${testResult.contentType || 'Unknown'}${sizeInfo}\n\n動画の配信は正常です`)
    } else {
      alert(`❌ R2動画URL接続テスト失敗\n\nステータス: ${testResult.status} ${testResult.statusText}\n\nR2バケットの公開設定またはCORS設定を確認してください`)
    }
    
  } catch (error) {
    console.error('❌ R2動画URL接続テストエラー:', error)
    alert(`❌ R2動画URL接続テストでエラーが発生しました:\n${error.message}\n\nネットワーク接続またはCORS設定を確認してください`)
  }
}

// 初期データ読み込み
onMounted(() => {
  loadProducts()
})

// ...existing video-related functions...

</script>

<style scoped>
.admin-panel {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  padding-top: 100px; /* ヘッダー(80px)分の余白 + 追加マージン */
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden !important;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  -webkit-user-select: none;
  user-select: none;
}

.admin-panel *,
.admin-panel *::before,
.admin-panel *::after {
  box-sizing: border-box !important;
  touch-action: manipulation;
  max-width: 100%;
}

.admin-panel img:not(.video-thumbnail-image),
.admin-panel video,
.admin-panel canvas,
.admin-panel iframe {
  touch-action: none !important;
  pointer-events: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-drag: none !important;
  max-width: 100% !important;
  height: auto !important;
}

/* 動画サムネイルコンテナはクリック可能に */
.video-thumbnail-main {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  pointer-events: auto !important;
  cursor: pointer !important;
  overflow: hidden;
  border-radius: 0;
}

.video-thumbnail-main * {
  pointer-events: none !important;
}

.video-thumbnail-main .video-thumbnail-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  z-index: 2;
}

/* サムネイル読み込みエラー時、フォールバックを確実に表示 */
.video-thumbnail-main .video-thumbnail-image[style*="display: none"] {
  z-index: 0;
}

/* 動画再生アイコンオーバーレイ */
.play-icon-overlay-main {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
  transition: all 0.3s ease;
}

.video-thumbnail-main:hover .play-icon-overlay-main {
  background: rgba(0, 0, 0, 0.85);
  transform: translate(-50%, -50%) scale(1.1);
}

.play-icon-overlay-main svg {
  width: 48px;
  height: 48px;
  margin-left: 4px;
}

/* 動画フォールバックアイコン */
.video-icon-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  pointer-events: none;
  z-index: 1;
}

.video-icon-fallback svg {
  opacity: 0.3;
}

/* 動画カウントバッジ */
.video-count-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  z-index: 11;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.admin-panel h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 700;
}

/* すべてのコンテナ要素にoverflow制御 */
.admin-panel > *,
.edit-form > *,
.products-list > *,
.product-grid > *,
.product-item > * {
  max-width: 100% !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
}

/* 画像を含む要素の完全制御 */
.product-image-container,
.video-thumbnail-main,
.swiper-container,
.swiper-wrapper,
.swiper-slide {
  max-width: 100% !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* 商品Swiperスタイル */
.product-swiper-container {
  position: relative;
  width: 100%;
  height: 269px; /* 明示的に高さを設定 */
  background-color: #f8f9fa; /* デフォルト背景 */
}

.product-swiper {
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  background-color: #f8f9fa; /* 画像読み込み中の背景 */
}

.product-swiper .swiper-slide {
  display: flex !important;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  visibility: visible !important;
  opacity: 1 !important;
}

.product-swiper .swiper-slide img {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  max-width: 100%;
  max-height: 100%;
}

.product-swiper .product-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* containに変更して画像全体を表示 */
  background-color: #f8f9fa;
  display: block; /* 確実に表示 */
}

/* 商品カード用矢印ボタン */
.product-swiper-next,
.product-swiper-prev {
  color: white !important;
  background: rgba(0, 0, 0, 0.5) !important;
  border-radius: 50% !important;
  width: 30px !important;
  height: 30px !important;
  margin-top: -15px !important;
  opacity: 0.7 !important; /* 常に表示（半透明） */
  transition: all 0.3s ease !important;
  pointer-events: auto !important;
  z-index: 10 !important;
}

.product-swiper-next:hover,
.product-swiper-prev:hover {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.7) !important;
  transform: scale(1.1) !important;
}

.product-swiper-next:after,
.product-swiper-prev:after {
  font-size: 12px !important;
  font-weight: bold !important;
}

/* 商品カード用ページネーション */
.product-swiper-pagination {
  bottom: 8px !important;
  pointer-events: auto !important;
  z-index: 10 !important;
}

.product-swiper-pagination .swiper-pagination-bullet {
  background: rgba(255, 255, 255, 0.7) !important;
  opacity: 1 !important;
  width: 6px !important;
  height: 6px !important;
  pointer-events: auto !important;
}



.product-swiper-pagination .swiper-pagination-bullet-active {
  background: white !important;
  transform: scale(1.2);
}

/* 単一画像コンテナ */
.single-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.single-image-container .product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.product-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  pointer-events: none;
}

@media (max-width: 768px) {
  .admin-panel {
    margin: 0 !important;
    padding: 1rem !important;
    padding-top: 100px !important; /* ヘッダー分の余白を確保 */
    border-radius: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
  }

  .admin-panel h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .admin-panel h3 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  .edit-form {
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .form-group label {
    text-align: left;
  }

  .product-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    padding: 0.5rem;
  }

  .products-list {
    padding: 1rem;
    margin-top: 1rem;
  }

  .product-image-container {
    height: 200px;
  }

  .product-details {
    padding: 1rem;
  }

  .product-details h4 {
    font-size: 1rem;
  }

  .product-details .price {
    font-size: 1.1rem;
  }

  .product-actions {
    flex-direction: column;
  }

  .btn-edit,
  .btn-delete {
    width: 100%;
  }

  .play-icon-overlay-main {
    width: 60px;
    height: 60px;
  }

  .play-icon-overlay-main svg {
    width: 36px;
    height: 36px;
  }
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-group {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  align-items: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  max-width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.9);
  color: #495057;
  box-sizing: border-box;
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  background: white;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  touch-action: pan-y;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
  touch-action: pan-y;
}

/* 大画面では3列表示 */
@media (min-width: 1400px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 中画面では2列表示 */
@media (min-width: 769px) and (max-width: 1399px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

.product-item {
  position: relative;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  touch-action: manipulation;
}

.product-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 269px; /* ProductList.vueと同じ高さに統一 */
  overflow: hidden;
  background: #f8f9fa; /* 背景色を設定 */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.product-image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* containに変更 */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  pointer-events: none;
}

.product-details {
  padding: 1.5rem;
}

.product-details h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
}

.product-details .price {
  font-size: 1.25rem;
  color: #2c5f2d;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.product-details .stock-info {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 1rem;
}

.product-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-edit,
.btn-delete {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-1px);
}

/* 動画モーダルのスタイル */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 0;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease-out;
  overflow: hidden;
  touch-action: none;
  -webkit-overflow-scrolling: none;
}

.video-content {
  position: relative;
  background: #000;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.video-content .modal-close,
.modal-close {
  position: fixed;
  top: env(safe-area-inset-top, 1rem);
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 28px;
  cursor: pointer;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  touch-action: manipulation;
  line-height: 1;
  padding: 0;
}

.video-content .modal-close:hover,
.modal-close:hover {
  background: rgba(220, 53, 69, 0.9);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.1);
}

.video-content .modal-close:active,
.modal-close:active {
  transform: scale(0.95);
}

/* スマホ用：動画モーダルの最適化 */
@media (max-width: 768px) {
  .video-modal {
    padding: 0 !important;
  }
  
  .video-content {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
  }
  
  .video-content .modal-close,
  .modal-close {
    top: max(env(safe-area-inset-top, 1rem), 1rem) !important;
    right: 1rem !important;
    width: 50px !important;
    height: 50px !important;
    font-size: 36px !important;
    background: rgba(0, 0, 0, 0.9) !important;
    border: 3px solid white !important;
    z-index: 10002 !important;
  }
}

@media (max-width: 480px) {
  .video-content .modal-close,
  .modal-close {
    top: max(env(safe-area-inset-top, 0.75rem), 0.75rem) !important;
    right: 0.75rem !important;
  }
}
</style>
