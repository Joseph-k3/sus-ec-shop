<template>
  <div class="shopping-cart-container">
    <div class="cart-header">
      <h2>🛒 お買い物かご</h2>
      <div class="cart-summary">
        <span class="item-count">{{ cart.itemCount }}点</span>
        <span class="total-amount">合計: ¥{{ cart.totalAmount.toLocaleString() }}</span>
      </div>
    </div>

    <div v-if="cart.items.length === 0" class="empty-cart">
      <div class="empty-cart-icon">🛒</div>
      <p class="empty-cart-message">カートに商品がありません</p>
      <router-link to="/" class="continue-shopping-btn">商品一覧へ戻る</router-link>
    </div>

    <div v-else class="cart-content">
      <div class="cart-items">
        <div v-for="item in cart.items" :key="item.id" class="cart-item">
          <div class="item-image">
            <img :src="item.image" :alt="item.name" />
          </div>
          <div class="item-details">
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-price">¥{{ item.price.toLocaleString() }}</p>
          </div>
          <div class="item-quantity">
            <button 
              @click="updateQuantity(item.id, item.quantity - 1)"
              :disabled="item.quantity <= 1"
              class="quantity-btn"
            >
              -
            </button>
            <input 
              type="number" 
              :value="item.quantity"
              @change="handleQuantityInput(item.id, $event.target.value)"
              min="1"
              :max="item.maxQuantity"
              class="quantity-input"
            />
            <button 
              @click="updateQuantity(item.id, item.quantity + 1)"
              :disabled="item.quantity >= item.maxQuantity"
              class="quantity-btn"
            >
              +
            </button>
          </div>
          <div class="item-subtotal">
            ¥{{ (item.price * item.quantity).toLocaleString() }}
          </div>
          <button 
            @click="removeItem(item.id)"
            class="remove-btn"
            title="カートから削除"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="cart-actions">
        <div class="action-buttons">
          <button 
            @click="clearAllItems"
            class="clear-cart-btn"
          >
            カートを空にする
          </button>
          <router-link to="/" class="continue-shopping-btn">
            買い物を続ける
          </router-link>
          <button 
            @click="proceedToCheckout"
            class="checkout-btn"
            :disabled="cart.items.length === 0"
          >
            注文手続きへ進む
          </button>
        </div>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="cart.isLoading" class="loading-overlay">
      <div class="loading-spinner-wrapper">
        <div class="loading-spinner-outer"></div>
        <div class="loading-spinner-inner"></div>
      </div>
    </div>

    <!-- メッセージ表示 -->
    <div v-if="message" class="message-overlay">
      <div class="message-box" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const cart = useCartStore()

const message = ref('')
const messageType = ref('success')

onMounted(() => {
  // カートデータを最新に更新
  cart.loadCartFromStorage()
})

const updateQuantity = async (productId, newQuantity) => {
  const result = await cart.updateQuantity(productId, newQuantity)
  if (!result.success) {
    showMessage(result.message, 'error')
  }
}

const handleQuantityInput = async (productId, value) => {
  const quantity = parseInt(value)
  if (isNaN(quantity) || quantity < 1) return
  await updateQuantity(productId, quantity)
}

const removeItem = async (productId) => {
  console.log('removeItem called with productId:', productId)
  if (confirm('この商品をカートから削除しますか？')) {
    console.log('User confirmed deletion')
    await cart.removeFromCart(productId)
    showMessage('商品をカートから削除しました', 'success')
  } else {
    console.log('User cancelled deletion')
  }
}

const clearAllItems = async () => {
  console.log('clearAllItems called')
  if (confirm('カート内のすべての商品を削除しますか？')) {
    console.log('User confirmed clear all')
    await cart.clearCart()
    showMessage('カートを空にしました', 'success')
  } else {
    console.log('User cancelled clear all')
  }
}

const proceedToCheckout = () => {
  // カート全体の注文処理画面に遷移
  router.push('/cart-checkout')
}

const showMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  
  // ダイアログ表示時にページトップへスムーズにスクロール
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
  
  // メッセージを5秒後に自動で消す
  setTimeout(() => {
    message.value = ''
  }, 5000)
}
</script>

<style scoped>
.shopping-cart-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  min-height: 80vh;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.cart-header h2 {
  color: #2c5f2d;
  font-size: 2rem;
  margin: 0;
}

.cart-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.item-count {
  color: #666;
  font-size: 1rem;
}

.total-amount {
  color: #2c5f2d;
  font-size: 1.5rem;
  font-weight: bold;
}

.empty-cart {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-cart-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-cart-message {
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.cart-items {
  margin-bottom: 2rem;
}

.cart-item {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 1rem;
  align-items: start;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  margin-bottom: 1rem;
  background: white;
  position: relative;
}

.item-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  grid-column: 1;
  grid-row: 1 / 3;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #f8f9fa;
}

.item-details {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  grid-column: 2;
  grid-row: 1;
  padding-right: 60px; /* 削除ボタン分のスペースを確保 */
}

.item-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: #2c5f2d;
  margin: 0 0 0.5rem 0;
}

.item-price {
  color: #666;
  margin: 0;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  grid-column: 1 / 3;
  grid-row: 2;
  justify-self: center;
  margin-top: 0.5rem;
}

.quantity-btn {
  background: #2c5f2d;
  color: white;
  border: none;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: rgba(44, 95, 45, 0.3);
  transition: all 0.15s ease;
  pointer-events: auto;
  position: relative;
  z-index: 10;
}

.quantity-btn:hover:not(:disabled) {
  background: #1e4220;
}

.quantity-btn:active:not(:disabled) {
  background: #1e4220 !important;
  transform: scale(0.92) !important;
  outline: none;
}

.quantity-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}

.quantity-input {
  width: 50px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.25rem;
}

.item-subtotal {
  font-weight: bold;
  color: #2c5f2d;
  font-size: 1.1rem;
  text-align: center;
  grid-column: 1 / 3;
  grid-row: 3;
  margin-top: 0.5rem;
}

.remove-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: rgba(220, 53, 69, 0.3);
  z-index: 100;
  pointer-events: auto;
}

.remove-btn:hover {
  background: #c82333;
}

.remove-btn:active {
  background: #c82333 !important;
  transform: scale(0.9) !important;
  outline: none;
}

.cart-actions {
  border-top: 2px solid #e0e0e0;
  padding-top: 2rem;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.clear-cart-btn, .continue-shopping-btn, .checkout-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.15s ease;
  min-height: 44px;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  pointer-events: auto;
  position: relative;
  z-index: 10;
}

.clear-cart-btn {
  background: #6c757d;
  color: white;
  -webkit-tap-highlight-color: rgba(108, 117, 125, 0.3);
}

.clear-cart-btn:hover {
  background: #5a6268;
}

.clear-cart-btn:active {
  background: #5a6268 !important;
  transform: scale(0.95) !important;
  outline: none;
}

.continue-shopping-btn {
  background: #28a745;
  color: white;
  -webkit-tap-highlight-color: rgba(40, 167, 69, 0.3);
}

.continue-shopping-btn:hover {
  background: #218838;
}

.continue-shopping-btn:active {
  background: #218838 !important;
  transform: scale(0.95) !important;
  outline: none;
}

.checkout-btn {
  background: #2c5f2d;
  color: white;
  font-size: 1.1rem;
  -webkit-tap-highlight-color: rgba(44, 95, 45, 0.3);
}

.checkout-btn:hover:not(:disabled) {
  background: #1e4220;
}

.checkout-btn:active:not(:disabled) {
  background: #1e4220 !important;
  transform: scale(0.95) !important;
  outline: none;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  z-index: 1000;
}

.loading-spinner-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
}

.loading-spinner-outer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 6px solid #e8f5e9;
  border-top: 6px solid #2c5f2d;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
  box-shadow: 0 0 15px rgba(44, 95, 45, 0.3);
}

.loading-spinner-inner {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 40px;
  height: 40px;
  border: 5px solid transparent;
  border-top: 5px solid #4caf50;
  border-right: 5px solid #81c784;
  border-radius: 50%;
  animation: spin 0.8s linear infinite reverse;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.message-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 99999 !important;
  margin: 0 !important;
  padding: 2rem !important;
  background: rgba(0, 0, 0, 0.5) !important;
  box-sizing: border-box !important;
}

.message-box {
  min-width: 300px;
  max-width: 600px;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  text-align: center;
  white-space: pre-line;
  line-height: 1.8;
  font-weight: 600;
  font-size: 1.15rem;
}

.message-box.success {
  border: 4px solid #28a745;
  color: #155724;
  background: #d4edda;
}

.message-box.error {
  border: 4px solid #dc3545;
  color: #721c24;
  background: #f8d7da;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .shopping-cart-container {
    padding: 1rem;
    margin: 0 auto;
    width: 100%;
    max-width: 100%;
    border-radius: 0;
  }

  .cart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .cart-header h2 {
    font-size: 1.5rem;
  }

  .cart-item {
    grid-template-columns: 80px 1fr;
    grid-template-rows: auto auto auto;
    gap: 0.75rem;
    padding: 1rem;
    padding-top: 3.5rem; /* 削除ボタン分の余白 */
  }

  .item-image {
    width: 80px;
    height: 80px;
    grid-column: 1;
    grid-row: 1;
  }

  .item-details {
    grid-column: 2;
    grid-row: 1;
    padding-right: 0;
  }

  .item-name {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .item-price {
    font-size: 0.9rem;
  }

  .item-quantity {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
    margin-top: 0.75rem;
    gap: 1rem;
  }

  .item-subtotal {
    grid-column: 1 / -1;
    grid-row: 3;
    text-align: center;
    margin-top: 0.75rem;
    font-size: 1.2rem;
  }

  .remove-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 48px;
    height: 48px;
    font-size: 1.4rem;
    z-index: 100;
    pointer-events: auto;
  }

  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .clear-cart-btn, .continue-shopping-btn, .checkout-btn {
    width: 100%;
    min-height: 50px;
    font-size: 1.05rem;
  }
  
  .quantity-btn {
    min-width: 50px;
    min-height: 50px;
    font-size: 1.3rem;
  }

  .quantity-input {
    width: 60px;
    height: 40px;
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .shopping-cart-container {
    padding: 0.75rem;
    margin: 0.25rem;
    width: calc(100% - 0.5rem);
  }
}
</style>
