<template>
  <!-- スプラッシュスクリーン - bodyに直接挿入 -->
  <Teleport to="body">
    <div v-show="showSplash" class="splash-screen">
      <img src="/logo.jpg" alt="SUS Plants Logo" class="splash-logo" />
    </div>
  </Teleport>

  <!-- メインコンテンツ -->
  <div v-show="!showSplash && showContent" class="product-list-container fade-in">   
    <div class="controls-section">
      <SortSelector v-model:sort="sortKey" />
      <div class="user-actions">
        <router-link to="/cart" class="cart-link">
          <span class="icon">🛒</span>
          <span class="cart-text">カート</span>
          <span v-if="cart.itemCount > 0" class="cart-badge">{{ cart.itemCount }}</span>
        </router-link>
        <router-link to="/my-orders" class="order-history-link">
          <span class="icon">📋</span>
          ご注文履歴
        </router-link>
      </div>
    </div>
    <div class="product-list" :class="{ 'admin-grid': route.path.startsWith('/admin') }">
      <div v-for="product in sortedProducts" :key="product.id" class="product-card" :class="{ 'sold-out': product.quantity <= 0, 'reserved': product.is_reserved }">
        <div class="image-container">
          <!-- 動画がある場合はサムネイルを全面表示 -->
          <div v-if="product.videos && product.videos.length > 0 && product.videos[0].thumbnail_url" 
               class="video-thumbnail-main" 
               @click="playVideo(product, product.videos[0])" 
               title="動画を再生">
            <img 
              :src="product.videos[0].thumbnail_url" 
              :alt="`${product.name} 動画サムネイル`"
              class="product-image video-thumbnail-image"
              @error="(e) => e.target.style.display = 'none'"
              @load="handleImageLoad"
            >
            <!-- サムネイル読み込みエラー時のフォールバック -->
            <div class="video-icon-fallback">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="white">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </div>
            <!-- 再生アイコンオーバーレイ -->
            <div class="play-icon-overlay-main">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <!-- 動画カウント（複数動画がある場合） -->
            <span v-if="product.videos.length > 1" class="video-count-badge">{{ product.videos.length }}本の動画</span>
          </div>
          
          <!-- 動画がない場合は従来通りの画像表示 -->
          <template v-else>
            <!-- 複数画像がある場合はSwiper -->
            <div v-if="product.images && product.images.length > 1" class="product-swiper-container">
              <div class="swiper product-swiper" :data-product-id="product.id">
                <div class="swiper-wrapper">
                  <div 
                    v-for="(image, index) in product.images" 
                    :key="image.id"
                    class="swiper-slide"
                    @click="openImageModal(product, index)"
                  >
                    <img 
                      :src="image.image_url" 
                      :alt="`${product.name} ${index + 1}`"
                      class="product-image"
                      @error="handleImageError"
                      @load="handleImageLoad"
                    >
                  </div>
                </div>
                <!-- PC用の小さな矢印 -->
                <div class="swiper-button-next product-swiper-next"></div>
                <div class="swiper-button-prev product-swiper-prev"></div>
                <!-- ページネーション（ドット） -->
                <div class="swiper-pagination product-swiper-pagination"></div>
              </div>
            </div>
            <!-- 単一画像の場合 -->
            <div v-else class="single-image-container">
              <img 
                :src="product.image" 
                :alt="product.name" 
                class="product-image main-image"
                @error="handleImageError"
                @load="handleImageLoad"
                @click="openImageModal(product)"
              >
            </div>
          </template>
          
          <div v-if="product.is_reserved" class="reserved-overlay">取引中</div>
          <div v-else-if="product.quantity <= 0" class="sold-out-overlay">売約済み</div>
        </div>
        <div class="product-info">
          <h3 class="product-name">{{ product.name }}</h3>
          <p class="product-description">{{ product.description }}</p>
          <p class="product-price">¥{{ product.price.toLocaleString() }}</p>
          <p class="stock-status" :class="{ 'low-stock': product.quantity <= 1 }">
            残り{{ product.quantity }}点
          </p>
          <div v-if="product.quantity > 0 && !product.is_reserved" class="action-buttons">
            <button 
              @click="addToCart(product, $event)"
              class="cart-button"
              :disabled="cartLoading"
              :ref="`cartBtn_${product.id}`"
            >
              🛒 カートに追加
            </button>
            <router-link 
              :to="{ name: 'purchase', params: { id: product.id }}" 
              class="purchase-button"
            >
              即購入
            </router-link>
          </div>
          <span v-else-if="product.is_reserved" class="status-text">取引中</span>
          <span v-else class="status-text">売約済み</span>
        </div>
      </div>
    </div>

    <!-- ポップアップメッセージ表示 -->
    <div 
      v-if="message" 
      class="popup-message" 
      :class="[messageType, { 'show': message }]"
      :style="popupStyle"
    >
      {{ message }}
    </div>

  </div>

  <!-- 画像拡大モーダル - ビューポート全体に表示 -->
  <Teleport to="body">
    <div v-if="modalImage" class="image-modal" @click="closeImageModal">
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeImageModal">&times;</button>
        
        <!-- Swiper画像ギャラリー -->
        <div class="swiper-container" ref="swiperContainer">
          <div class="swiper-wrapper">
            <div 
              v-for="(image, index) in modalImage.images" 
              :key="image.id"
              class="swiper-slide"
            >
              <img 
                :src="image.image_url" 
                :alt="image.alt_text || modalImage.name" 
                class="modal-image"
                @error="handleImageError"
              >
            </div>
          </div>
          
          <!-- PC用ナビゲーション矢印 -->
          <div class="swiper-button-next swiper-nav-arrow"></div>
          <div class="swiper-button-prev swiper-nav-arrow"></div>
          
          <!-- ページネーション -->
          <div class="swiper-pagination"></div>
        </div>
        
        <div class="modal-info">
          <h3>{{ modalImage.name }}</h3>
          <p class="modal-price">¥{{ modalImage.price.toLocaleString() }}</p>
          <div v-if="modalImage.images && modalImage.images.length > 1" class="image-count">
            {{ currentSwiperIndex + 1 }} / {{ modalImage.images.length }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 動画モーダル -->
  <Teleport to="body">
    <div v-if="showVideoModal" class="video-modal" @click="closeVideoModal">
      <div class="video-content" @click.stop>
        <button class="modal-close" @click="closeVideoModal">&times;</button>
        <R2VideoPlayer :videoUrl="currentVideoUrl" :autoplay="true" @close="closeVideoModal" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SortSelector from './SortSelector.vue'
import R2VideoPlayer from './R2VideoPlayer.vue'
import { supabase } from '../lib/supabase'
import { getOrCreateCustomerId } from '../lib/customerUtils'
import getPublicImageUrl from '../lib/imageUtils.js'
import { useImageFallback } from '../composables/useImageFallback.js'
import { useCartStore } from '../stores/cart'
import { getProductImagesWithFallback } from '../lib/productImages'
// Swiperのインポート
import { Swiper } from 'swiper'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const route = useRoute()
const cart = useCartStore()

// 画像エラーハンドリング
const { handleImageError, handleImageLoad } = useImageFallback()

const products = ref([])
const customerId = ref('')
const cartLoading = ref(false)
const message = ref('')
const messageType = ref('success')
const popupStyle = ref({})
const modalImage = ref(null)
const currentImageIndex = ref(0)
// Swiper関連
const swiperContainer = ref(null)
const swiperInstance = ref(null)
const currentSwiperIndex = ref(0)
// スプラッシュ関連
const showSplash = ref(true)
const showContent = ref(false)
// 動画モーダル関連
const showVideoModal = ref(false)
const currentVideoUrl = ref('')
const currentProduct = ref(null)

onMounted(async () => {
  // 本番運用時は常にスプラッシュを表示、開発時はComingSoon画面からの遷移の場合のみ表示
  const shouldShowSplash = sessionStorage.getItem('show-splash-after-login') === 'true'
  const isProduction = import.meta.env.PROD || import.meta.env.VITE_FORCE_SPLASH === 'true' // 本番ビルドまたは環境変数で強制スプラッシュ
  
  if (isProduction || shouldShowSplash) {
    // スプラッシュ表示時にbodyのスクロールを無効化と背景色を統一
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.backgroundColor = '#f5f5f5'
    // #app要素を完全に非表示にして白いバーを防ぐ
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.style.visibility = 'hidden'
    }
    
    // 本番運用時またはComingSoon画面からの遷移の場合はスプラッシュアニメーション開始
    if (shouldShowSplash) {
      sessionStorage.removeItem('show-splash-after-login') // フラグをクリア
    }
    setTimeout(() => {
      showSplash.value = false
      // bodyのスタイルを復元
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.backgroundColor = ''
      // #app要素を表示復元
      const appElement = document.getElementById('app')
      if (appElement) {
        appElement.style.visibility = 'visible'
      }
      // スプラッシュが完全に消えてからコンテンツを表示（間隔をなくす）
      setTimeout(() => {
        showContent.value = true
      }, 50) // 50msの短い遅延でよりスムーズに
    }, 2000) // 2秒間スプラッシュ表示
  } else {
    // 開発時の通常のアクセスの場合はスプラッシュをスキップ
    showSplash.value = false
    showContent.value = true
  }

  // 購入者IDを取得
  customerId.value = getOrCreateCustomerId()
  
  // 商品一覧を取得
  await fetchProducts()
  
  // DOM更新後に商品カードのSwiperを初期化
  await nextTick()
  initProductSwipers()
  
  // 30秒ごとに在庫情報を更新
  setInterval(fetchProducts, 30000)
})

// クリーンアップ処理
onUnmounted(() => {
  // bodyのスタイルを確実に復元
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
  document.body.style.backgroundColor = ''
  // #app要素も復元
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.style.visibility = 'visible'
  }
})

// 商品カード内のSwiperを初期化
const initProductSwipers = () => {
  products.value.forEach(product => {
    if (product.images && product.images.length > 1) {
      const swiperEl = document.querySelector(`.product-swiper[data-product-id="${product.id}"]`)
      if (swiperEl && !swiperEl.swiper) {
        console.log(`Initializing Swiper for product ${product.id}`)
        
        // 画像の読み込みを待つ
        const images = swiperEl.querySelectorAll('img')
        const imagePromises = Array.from(images).map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
          })
        })
        
        Promise.all(imagePromises).then(() => {
          // 既存のSwiperインスタンスがある場合は削除
          if (swiperEl.swiper) {
            console.log(`[ProductList] Destroying existing Swiper for product ${product.id}`)
            swiperEl.swiper.destroy(true, true)
          }
          
          // ナビゲーションボタンの存在を確認
          const nextEl = swiperEl.querySelector('.product-swiper-next')
          const prevEl = swiperEl.querySelector('.product-swiper-prev')
          const paginationEl = swiperEl.querySelector('.product-swiper-pagination')
          
          console.log(`[ProductList] Navigation elements for product ${product.id}:`, { nextEl, prevEl, paginationEl })
          
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
            // タッチ操作を有効化
            touchRatio: 1,
            simulateTouch: true,
            grabCursor: true,
            // Swiperの自動高さ調整
            autoHeight: false,
            // スライド切り替え時の処理
            on: {
              init: function() {
                console.log(`[ProductList] Swiper initialized for product ${product.id}, slides count: ${this.slides.length}`)
                // 初期化後に画像の可視性を確認・修正
                this.slides.forEach((slide, index) => {
                  const img = slide.querySelector('img')
                  if (img) {
                    img.style.display = 'block'
                    img.style.visibility = 'visible'
                    img.style.opacity = '1'
                    console.log(`[ProductList] Image ${index} visibility reset for product ${product.id}`)
                  }
                })
                this.update()
              },
              slideChange: function() {
                console.log(`[ProductList] Slide changed for product ${product.id}, current index: ${this.activeIndex}, real index: ${this.realIndex}`)
                // スライド変更時に現在の画像の可視性を確認・修正
                const activeSlide = this.slides[this.activeIndex]
                if (activeSlide) {
                  const img = activeSlide.querySelector('img')
                  if (img) {
                    img.style.display = 'block'
                    img.style.visibility = 'visible'
                    img.style.opacity = '1'
                    console.log(`[ProductList] Active slide image visibility reset for product ${product.id}`)
                  }
                }
                this.update()
              }
            }
          })
          
          console.log(`[ProductList] Swiper instance created for product ${product.id}:`, swiperInstance)
          
          // 初期化後に強制的にupdate
          setTimeout(() => {
            swiperInstance.update()
            console.log(`[ProductList] Forced update executed for product ${product.id}`)
          }, 100)
        }).catch(error => {
          console.error(`[ProductList] Error initializing Swiper for product ${product.id}:`, error)
        })
      }
    }
  })
}

// 商品データを取得する関数
const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('succulents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // 各商品の画像と動画を取得
    const productsWithMedia = await Promise.all(
      data.map(async (product) => {
        // 画像取得
        const images = await getProductImagesWithFallback(product)
        const primaryImage = images.find(img => img.is_primary) || images[0]
        
        // 動画取得
        const { data: videos, error: videoError } = await supabase
          .from('product_videos')
          .select('*')
          .eq('product_id', product.id)
          .order('display_order', { ascending: true })
        
        if (videoError) {
          console.error('❌ 動画取得エラー:', videoError)
        } else if (videos && videos.length > 0) {
          console.log(`✅ 商品「${product.name}」の動画取得成功:`, videos.length, '本')
          console.log('動画データ:', videos.map(v => ({
            video_url: v.video_url,
            thumbnail_url: v.thumbnail_url,
            storage_provider: v.storage_provider
          })))
        }
        
        // 動画URLの処理
        const processedVideos = videos && videos.length > 0 ? videos.map(video => {
          const videoUrl = getPublicImageUrl(video.video_url)
          const thumbnailUrl = video.thumbnail_url ? getPublicImageUrl(video.thumbnail_url) : null
          
          console.log('🎬 動画URL処理:', {
            original_video: video.video_url,
            processed_video: videoUrl,
            original_thumbnail: video.thumbnail_url,
            processed_thumbnail: thumbnailUrl
          })
          
          return {
            ...video,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl
          }
        }) : []
        
        return {
          ...product,
          image: primaryImage ? getPublicImageUrl(primaryImage.image_url) : getPublicImageUrl(product.image),
          images: images.map(img => ({
            ...img,
            image_url: getPublicImageUrl(img.image_url)
          })),
          videos: processedVideos
        }
      })
    )
    
    products.value = productsWithMedia
    
    // DOM更新後にSwiperを初期化
    await nextTick()
    initProductSwipers()
  } catch (error) {
    console.error('商品データ取得エラー:', error)
  }
}

const sortKey = ref('default')

const sortedProducts = computed(() => {
  let arr = [...products.value]
  switch (sortKey.value) {
    case 'price-asc':
      arr.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      arr.sort((a, b) => b.price - a.price)
      break
    case 'name-asc':
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      break
    case 'name-desc':
      arr.sort((a, b) => b.name.localeCompare(a.name, 'ja'))
      break
    default:
      arr = [...products.value]
  }
  return arr
})

// 画像モーダル関連の関数
const openImageModal = async (product, imageIndex = 0) => {
  modalImage.value = product
  currentImageIndex.value = imageIndex
  currentSwiperIndex.value = imageIndex
  document.body.style.overflow = 'hidden' // スクロールを無効化
  
  // DOM更新を待ってからSwiperを初期化
  await nextTick()
  initSwiper()
}

const closeImageModal = () => {
  // Swiperインスタンスを破棄
  if (swiperInstance.value) {
    swiperInstance.value.destroy(true, true)
    swiperInstance.value = null
  }
  
  modalImage.value = null
  currentImageIndex.value = 0
  currentSwiperIndex.value = 0
  document.body.style.overflow = '' // スクロールを復元
}

// Swiperを初期化
const initSwiper = () => {
  if (!swiperContainer.value || !modalImage.value?.images?.length) return
  
  // 既存のSwiperインスタンスがあれば破棄
  if (swiperInstance.value) {
    swiperInstance.value.destroy(true, true)
  }
  
  swiperInstance.value = new Swiper(swiperContainer.value, {
    modules: [Navigation, Pagination],
    initialSlide: currentSwiperIndex.value,
    loop: modalImage.value.images.length > 1,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      type: 'bullets',
    },
    // スマホではスワイプを有効化、PCでは矢印メインに
    touchRatio: 1,
    simulateTouch: true,
    grabCursor: true,
    // スライド変更時のコールバック
    on: {
      slideChange: function () {
        currentSwiperIndex.value = this.realIndex
      }
    }
  })
}



// カートに商品を追加
const addToCart = async (product, event) => {
  cartLoading.value = true
  try {
    const result = await cart.addToCart(product, 1)
    if (result.success) {
      showMessage('カートに追加しました！', 'success', event)
      // 商品リストを更新して在庫数を反映
      await fetchProducts()
    } else {
      showMessage(result.message, 'error', event)
    }
  } catch (error) {
    showMessage('カートへの追加に失敗しました', 'error', event)
  } finally {
    cartLoading.value = false
  }
}

// メッセージ表示
const showMessage = (text, type = 'success', event = null) => {
  message.value = text
  messageType.value = type
  
  // クリックされたボタンの真上にポップアップを表示
  if (event && event.target) {
    const containerRect = document.querySelector('.product-list-container').getBoundingClientRect()
    const buttonRect = event.target.getBoundingClientRect()
    
    // ボタンを基準とした相対位置で計算
    popupStyle.value = {
      position: 'absolute',
      top: `${buttonRect.top - containerRect.top - 50}px`,
      left: `${buttonRect.left - containerRect.left + buttonRect.width / 2}px`,
      transform: 'translateX(-50%)',
      zIndex: 1000
    }
  } else {
    // フォールバック：画面中央に表示
    popupStyle.value = {
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000
    }
  }
  
  setTimeout(() => {
    message.value = ''
    popupStyle.value = {}
  }, 3000)
}

// 動画再生
const playVideo = (product, video) => {
  currentProduct.value = product
  currentVideoUrl.value = video.video_url || video
  showVideoModal.value = true
  
  // スクロールとスワイプを完全に無効化
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.touchAction = 'none'
  document.body.classList.add('video-playing')
  
  // iOS Safariでのスクロール防止
  document.documentElement.style.overflow = 'hidden'
}

// 動画モーダルを閉じる
const closeVideoModal = () => {
  showVideoModal.value = false
  currentVideoUrl.value = ''
  currentProduct.value = null
  
  // スクロールとスワイプの制限を解除
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
  document.body.style.touchAction = ''
  document.body.classList.remove('video-playing')
  
  // iOS Safariでのスクロール復元
  document.documentElement.style.overflow = ''
}
</script>

<style scoped>
/* 全画面の背景画像設定 */
.product-list-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  padding-top: 100px; /* ヘッダー(80px)分の余白 + 追加マージン */
  box-sizing: border-box;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* 全画面固定背景 */
.product-list-container::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #444444;
  z-index: -2;
}

/* 背景のオーバーレイを削除（#444444の単色背景を使用） */
.product-list-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  pointer-events: none;
  z-index: -1;
}

.header-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
}

.controls-section {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  position: relative;
  z-index: 10;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
}

.controls-section > :first-child {
  margin-left: 2rem;
}

.user-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.cart-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #2c5f2d;
  border-radius: 8px;
  text-decoration: none;
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 44px;
  box-sizing: border-box;
  white-space: nowrap;
  position: relative;
}

.cart-link:hover {
  background: #1e4220;
  transform: translateY(-1px);
}

.cart-badge {
  background: #dc3545;
  color: white;
  border-radius: 50%;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  min-width: 1.2rem;
  height: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
}

.order-history-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  color: #495057;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 44px;
  box-sizing: border-box;
  white-space: nowrap;
}

.order-history-link:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.order-history-link .icon {
  font-size: 1.2rem;
}

.customer-info {
  text-align: right;
}

.customer-id {
  color: #6c757d;
  font-size: 0.875rem;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* デフォルトは2列 */
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 5;
}

div[class~="admin-grid"] {
  grid-template-columns: repeat(4, 1fr) !important; /* 管理者ページでは4列 */
  gap: 1.5rem;
}

.product-card {
  position: relative;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  transition: transform 0.2s ease;
  z-index: 5;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.image-container {
  position: relative;
  width: 100%;
  height: 269px;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.product-image:hover {
  transform: scale(1.02);
}

.product-info {
  padding: 1.5rem;
}

.product-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #1a1a1a;
  font-weight: 600;
}

.product-description {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
}

.product-price {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c5f2d;
}

.stock-status {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #555;
  font-weight: 500;
}

.low-stock {
  color: #dc3545;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.cart-button {
  padding: 0.5rem 1rem;
  background-color: #2c5f2d;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.9rem;
  flex: 1;
  min-width: 110px;
}

.cart-button:hover:not(:disabled) {
  background-color: #1e4220;
}

.cart-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.purchase-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.2s;
  text-align: center;
  box-sizing: border-box;
  font-size: 0.9rem;
  flex: 1;
  min-width: 110px;
}

.purchase-button:hover {
  background-color: #388E3C;
}


/* 売約済み・取引中の商品カード全体のスタイル */
.product-card.sold-out {
  pointer-events: none;
  transform: none !important;
}

.product-card.reserved {
  pointer-events: none;
  transform: none !important;
}

.product-card.sold-out:hover,
.product-card.reserved:hover {
  transform: none !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
}

/* 売約済み・取引中商品の画像のみにフィルター適用 */
.product-card.sold-out .product-image {
  filter: grayscale(100%) brightness(0.7) contrast(0.8);
}

.product-card.reserved .product-image {
  filter: brightness(0.7) saturate(0.6);
}

/* オーバーレイのスタイル */
.reserved-overlay,
.sold-out-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  z-index: 10;
}

.reserved-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.sold-out-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.status-text {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #6c757d;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  min-width: 120px;
  text-align: center;
  box-sizing: border-box;
}

/* 動画サムネイルをメイン画像として表示 */
.video-thumbnail-main {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.video-thumbnail-main .video-thumbnail-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  z-index: 2;
}

/* サムネイル読み込みエラー時のフォールバック */
.video-icon-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 1;
}

/* 画像が非表示になった場合、フォールバックを確実に表示 */
.video-thumbnail-main .video-thumbnail-image[style*="display: none"] {
  z-index: 0;
}

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
}

/* 動画モーダル */
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
  touch-action: none; /* スワイプを完全に無効化 */
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
  touch-action: none; /* スワイプを完全に無効化 */
}

.video-content .modal-close {
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
}

.video-content .modal-close:hover {
  background: rgba(220, 53, 69, 0.9);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.1);
}

.video-content .modal-close:active {
  transform: scale(0.95);
}

/* ポップアップメッセージ表示 */
.popup-message {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(-10px) scale(0.8);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  border: 2px solid transparent;
}

.popup-message.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.popup-message.success {
  color: #28a745;
  background: linear-gradient(135deg, #ffffff 0%, #f0fff4 100%);
  border-color: #28a745;
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.2);
}

.popup-message.error {
  color: #dc3545;
  background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
  border-color: #dc3545;
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.2);
}

.popup-message::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.popup-message.success::after {
  border-top-color: #f0fff4;
}

.popup-message.error::after {
  border-top-color: #fff5f5;
}

/* 画像ギャラリー関連のスタイル */
.image-gallery {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #f8f9fa;
}

.thumbnail-container {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  padding: 4px;
}

.thumbnail-grid {
  display: flex;
  gap: 2px;
  align-items: center;
}

.thumbnail {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease;
}

.thumbnail:hover {
  transform: scale(1.1);
  border-color: white;
}

.more-images {
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  min-width: 20px;
  text-align: center;
}

/* モーダル内ナビゲーション */
.image-navigation {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  pointer-events: none;
  z-index: 10002;
}

.nav-btn {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  pointer-events: auto;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.nav-btn:active {
  transform: scale(0.95);
}

/* 画像インジケーター */
.image-indicators {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10002;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.indicator.active {
  background: white;
}

.indicator:hover {
  background: rgba(255, 255, 255, 0.8);
}

.image-count {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.5rem;
  text-align: center;
}

/* 商品カード内のSwiper */
.product-swiper-container {
  position: relative;
  width: 100%;
  height: 290px;
  background-color: #f8f9fa; /* デフォルト背景 */
}

.product-swiper {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8f9fa; /* 画像読み込み中の背景 */
}

.product-swiper .swiper-slide {
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #f8f9fa; /* スライドの背景 */
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
  object-fit: contain;
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
  z-index: 10 !important;
  pointer-events: auto !important;
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
}

.product-swiper-pagination .swiper-pagination-bullet {
  background: rgba(255, 255, 255, 0.7) !important;
  opacity: 1 !important;
  width: 6px !important;
  height: 6px !important;
}

.product-swiper-pagination .swiper-pagination-bullet-active {
  background: white !important;
  transform: scale(1.2);
}

/* 単一画像コンテナ */
.single-image-container {
  width: 100%;
  height: 269px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8f9fa;
}

/* レスポンシブ対応 */
@media screen and (max-width: 1400px) {
  div[class~="admin-grid"] {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media screen and (max-width: 1100px) {
  div[class~="admin-grid"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .product-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .product-list,
  div[class~="admin-grid"] {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    padding: 1rem;
    margin: 0 auto;
    width: 100%;
    max-width: 100%;
  }

  .product-list-container {
    padding: 0.5rem;
    padding-top: 120px !important; /* スマホでヘッダー分の余白を十分確保 */
    margin: 0 auto;
    width: 100%;
    max-width: 100%;
  }

  .controls-section {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 1rem;
    margin: 0 auto;
    width: calc(100% - 1rem);
    max-width: 100%;
  }
  
  .controls-section > :first-child {
    margin-left: 0;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }

  .cart-button,
  .purchase-button {
    width: 100%;
    flex: none;
    min-height: 48px;
  }

  .user-actions {
    justify-content: center;
    width: 100%;
    gap: 0.75rem;
  }
  
  .cart-link,
  .order-history-link {
    flex: 1;
    justify-content: center;
    min-height: 48px;
  }
  
  .order-history-link {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  /* モバイルでの売約済み・取引中商品の調整 */
  .reserved-overlay,
  .sold-out-overlay {
    font-size: 1rem;
    font-weight: bold;
  }
}

@media screen and (max-width: 480px) {
  .product-list {
    padding: 0.5rem;
    gap: 1rem;
    margin: 0 auto;
    width: calc(100% - 1rem);
  }
  
  .product-list-container {
    padding: 0.25rem;
    padding-top: 130px !important; /* 小さなスマホでヘッダー分の余白を十分確保 */
  }
  
  .controls-section {
    padding: 0.75rem;
    width: calc(100% - 0.5rem);
    margin: 0 auto;
  }
  
  .order-history-link .icon {
    font-size: 1rem;
  }
  
  .product-card {
    margin: 0 auto;
    width: 100%;
    max-width: 100%;
  }
  
  .product-info {
    padding: 1rem;
  }
  
  /* スマホでは商品カードの矢印を非表示に（スワイプメイン） */
  .product-swiper-next,
  .product-swiper-prev {
    display: none !important;
  }
  
  .image-container {
    height: 200px;
  }
  
  .product-swiper-container,
  .single-image-container {
    height: 200px;
  }
  
  /* 非常に小さな画面での売約済み表示調整 */
  .reserved-overlay,
  .sold-out-overlay {
    font-size: 0.9rem;
  }
  
  .modal-info {
    padding: 0.75rem;
  }
  
  /* 非常に小さな画面での動画サムネイル調整 */
  .play-icon-overlay-main {
    width: 50px;
    height: 50px;
  }
  
  .play-icon-overlay-main svg {
    width: 30px;
    height: 30px;
  }
  
  .video-count-badge {
    font-size: 0.7rem;
    padding: 3px 8px;
  }
  
  /* 動画モーダルを完全に画面いっぱいに */
  .video-content {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
}

/* 画像拡大モーダル */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  width: 90vw;
  height: 90vh;
  max-width: 1000px;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* Swiperコンテナ */
.swiper-container {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  width: 100%;
  height: 100%;
}

.modal-image {
  max-width: 90%;
  max-height: 90%;
  width: auto;
  height: auto;
  object-fit: contain;
  background-color: transparent;
}

/* Swiper矢印ボタンのカスタマイズ */
.swiper-nav-arrow {
  color: white !important;
  background: rgba(0, 0, 0, 0.6) !important;
  border-radius: 50% !important;
  width: 50px !important;
  height: 50px !important;
  margin-top: -25px !important;
  transition: all 0.3s ease !important;
}

.swiper-nav-arrow:hover {
  background: rgba(0, 0, 0, 0.8) !important;
  transform: scale(1.1) !important;
}

.swiper-nav-arrow:after {
  font-size: 20px !important;
  font-weight: bold !important;
}

/* ページネーション */
.swiper-pagination {
  bottom: 10px !important;
}

.swiper-pagination-bullet {
  background: rgba(255, 255, 255, 0.5) !important;
  opacity: 1 !important;
}

.swiper-pagination-bullet-active {
  background: white !important;
}

.modal-info {
  padding: 1.5rem;
  text-align: center;
  background: white;
}

.modal-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #1a1a1a;
}

.modal-price {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  color: #2c5f2d;
}

/* スマートフォン用モーダル調整 */
@media screen and (max-width: 768px) {
  .modal-content {
    width: 95vw;
    height: 95vh;
    max-width: none;
    max-height: none;
  }
  
  .modal-image {
    max-width: 95%;
    max-height: 85%;
  }
  
  /* スマホでは矢印を少し小さく */
  .swiper-nav-arrow {
    width: 40px !important;
    height: 40px !important;
    margin-top: -20px !important;
  }
  
  .swiper-nav-arrow:after {
    font-size: 16px !important;
  }
  
  .modal-info {
    padding: 1rem;
    flex-shrink: 0;
  }
  
  .modal-info h3 {
    font-size: 1.25rem;
  }
  
  .modal-price {
    font-size: 1.1rem;
  }
  
  /* モバイルでの動画サムネイル用再生アイコンを少し小さく */
  .play-icon-overlay-main {
    width: 60px;
    height: 60px;
  }
  
  .play-icon-overlay-main svg {
    width: 36px;
    height: 36px;
  }
  
  .video-count-badge {
    font-size: 0.75rem;
    padding: 4px 10px;
  }
  
  /* モバイルで動画モーダルを全画面フルスクリーンに */
  .video-modal {
    padding: 0;
    background-color: #000;
  }
  
  .video-content {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .video-content .modal-close {
    top: max(env(safe-area-inset-top, 0.5rem), 0.5rem);
    right: 0.5rem;
    width: 48px;
    height: 48px;
    font-size: 32px;
    background: rgba(0, 0, 0, 0.9);
  }
}

/* 非常に小さな画面では矢印を非表示にしてスワイプメインに */
@media screen and (max-width: 480px) {
  .swiper-nav-arrow {
    display: none !important;
  }
  
  .modal-content {
    width: 98vw;
    height: 98vh;
  }
  
  .modal-image {
    max-width: 98%;
    max-height: 80%;
  }
  
  .modal-info {
    padding: 0.75rem;
  }
  
  /* 動画モーダルは完全に画面いっぱい（スワイプ不可） */
  .video-modal {
    overflow: hidden;
    overscroll-behavior: none;
  }
  
  .video-content {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    overflow: hidden;
  }
  
  body.video-playing {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }
}

/* スプラッシュスクリーン - CSS Grid による完全な中央配置 */
.splash-screen {
  /* 完全な画面占有 */
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  
  /* 背景とz-index */
  background-color: #f5f5f5 !important;
  z-index: 999999 !important;
  
  /* レイアウトリセット */
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  
  /* CSS Grid による中央配置 */
  display: grid !important;
  place-items: center !important;
  place-content: center !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 1fr !important;
  justify-items: center !important;
  align-items: center !important;
  justify-content: center !important;
  align-content: center !important;
  
  /* アニメーションと制約 */
  animation: fadeOut 0.8s ease-in-out 1.5s forwards;
  overflow: hidden !important;
  transform: none !important;
  
  /* 完全なリセット */
  inset: 0 !important;
  float: none !important;
  clear: both !important;
  contain: layout style paint !important;
  text-align: center !important;
}

.splash-logo {
  /* サイズ設定 */
  width: 75vmin !important;
  height: 75vmin !important;
  max-width: 400px !important;
  max-height: 400px !important;
  min-width: 200px !important;
  min-height: 200px !important;
  
  /* 画像表示 */
  object-fit: cover !important;
  border-radius: 50% !important;
  
  /* レイアウト */
  display: block !important;
  margin: 0 auto !important;
  position: relative !important;
  
  /* Grid子要素としての中央配置 */
  justify-self: center !important;
  align-self: center !important;
  place-self: center !important;
  
  /* アニメーション */
  animation: logoAnimation 2s ease-in-out;
  
  /* 完全なリセット */
  border: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  float: none !important;
  clear: both !important;
  vertical-align: middle !important;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes logoAnimation {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* メインコンテンツのフェードイン */
.product-list-container {
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.product-list-container.fade-in {
  opacity: 1;
}
</style>
