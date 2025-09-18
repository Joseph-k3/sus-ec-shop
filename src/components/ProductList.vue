<template>
  <div class="product-list-container">   
    <div class="controls-section">
      <SortSelector v-model:sort="sortKey" />
      <div class="user-actions">
        <router-link to="/my-orders" class="order-history-link">
          <span class="icon">📋</span>
          ご注文履歴
        </router-link>
      </div>
    </div>
    <div class="product-list" :class="{ 'admin-grid': route.path.startsWith('/admin') }">
      <div v-for="product in sortedProducts" :key="product.id" class="product-card">
        <div class="image-container">
          <img 
            :src="product.image" 
            :alt="product.name" 
            class="product-image"
            @error="handleImageError"
            @load="handleImageLoad"
          >
          <div v-if="product.is_reserved" class="reserved-overlay"></div>
          <div v-else-if="product.quantity <= 0" class="sold-out-overlay"></div>
        </div>
        <div class="product-info">
          <h3 class="product-name">{{ product.name }}</h3>
          <p class="product-description">{{ product.description }}</p>
          <p class="product-price">¥{{ product.price.toLocaleString() }}</p>
          <p class="stock-status" :class="{ 'low-stock': product.quantity <= 1 }">
            残り{{ product.quantity }}点
          </p>
          <router-link 
            v-if="product.quantity > 0 && !product.is_reserved"
            :to="{ name: 'purchase', params: { id: product.id }}" 
            class="purchase-button"
          >
            購入する
          </router-link>
          <span v-else-if="product.is_reserved" class="status-text">取引中</span>
          <span v-else class="status-text">売約済み</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SortSelector from './SortSelector.vue'
import { supabase } from '../lib/supabase'
import { getOrCreateCustomerId } from '../lib/customerUtils'
import getPublicImageUrl from '../lib/imageUtils.js'
import { useImageFallback } from '../composables/useImageFallback.js'

const route = useRoute()

// 画像エラーハンドリング
const { handleImageError, handleImageLoad } = useImageFallback()

const products = ref([])
const customerId = ref('')

onMounted(async () => {
  // 購入者IDを取得
  customerId.value = getOrCreateCustomerId()
  
  // 商品一覧を取得
  await fetchProducts()
  
  // 30秒ごとに在庫情報を更新
  setInterval(fetchProducts, 30000)
})

// 商品データを取得する関数
const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('succulents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // 画像URLを公開URLに変換
    products.value = data.map(product => ({
      ...product,
      image: getPublicImageUrl(product.image)
    }))
  } catch (error) {
    console.error('商品データの取得に失敗しました:', error)
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

// ソート処理のみ残す
</script>

<style scoped>
/* 全画面の背景画像設定 */
.product-list-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
  min-height: 100vh;
  position: relative;
}

/* 全画面固定背景 */
.product-list-container::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/succulents.JPEG');
  background-size: cover;
  background-position: center 90%;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: -2;
}

/* 背景画像の上に半透明のオーバーレイを追加 */
.product-list-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
  min-height: 44px;
}

.controls-section > :first-child {
  margin-left: 2rem;
}

.user-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
  z-index: 5;
}

.product-card:hover {
  transform: translateY(-4px);
}

.image-container {
  position: relative;
  width: 100%;
  height: 200px;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  padding: 1.5rem;
}

.product-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #333;
}

.product-description {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.product-price {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.stock-status {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
}

.low-stock {
  color: #dc3545;
  font-weight: bold;
}

.purchase-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.2s;
  min-width: 120px;
  text-align: center;
  box-sizing: border-box;
}

.purchase-button:hover {
  background-color: #388E3C;
}


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
}

.reserved-overlay {
  background: rgba(0, 0, 0, 0.7);
}

.sold-out-overlay {
  background: rgba(128, 128, 128, 0.8);  /* よりグレーっぽい半透明 */
  backdrop-filter: grayscale(100%);  /* 下の画像をグレースケールに */
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
    padding: 0.5rem;
  }

  .controls-section {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 0 0.5rem;
  }

  .user-actions {
    justify-content: center;
  }
  
  .order-history-link {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

/* 非常に小さなスマートフォン用 */
@media screen and (max-width: 480px) {
  .product-list {
    padding: 0.25rem;
    gap: 0.75rem;
  }
  
  .controls-section {
    padding: 0 0.25rem;
  }
  
  .order-history-link .icon {
    font-size: 1rem;
  }
  
  .product-card {
    padding: 1rem;
  }
}
</style>
