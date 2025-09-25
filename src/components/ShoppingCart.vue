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
              @touchend="updateQuantity(item.id, item.quantity - 1)"
              @mousedown.prevent
              :disabled="item.quantity <= 1"
              class="quantity-btn"
              type="button"
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
              @touchend="updateQuantity(item.id, item.quantity + 1)"
              @mousedown.prevent
              :disabled="item.quantity >= item.maxQuantity"
              class="quantity-btn"
              type="button"
            >
              +
            </button>
          </div>
          <div class="item-subtotal">
            ¥{{ (item.price * item.quantity).toLocaleString() }}
          </div>
          <button 
            @click="removeItem(item.id, $event)"
            @touchend="removeItem(item.id, $event)"
            @mousedown.prevent
            @contextmenu.prevent
            class="remove-btn"
            title="カートから削除"
            type="button"
          >
            削除🗑️
          </button>
        </div>
      </div>

      <div class="cart-actions">
        <div class="action-buttons">
          <button 
            @click="clearAllItems($event)" 
            @touchend="clearAllItems($event)"
            @mousedown.prevent
            @contextmenu.prevent
            class="clear-cart-btn"
            type="button"
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
      <div class="loading-spinner"></div>
    </div>

    <!-- メッセージ表示 -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
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

const removeItem = async (productId, event = null) => {
  console.log('削除ボタンが押されました:', productId, event?.type)
  console.log('イベント詳細:', event)
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  if (confirm('この商品をカートから削除しますか？')) {
    console.log('削除を確認しました:', productId)
    await cart.removeFromCart(productId)
    showMessage('商品をカートから削除しました', 'success')
  } else {
    console.log('削除をキャンセルしました:', productId)
  }
}

const clearAllItems = async (event = null) => {
  console.log('カートを空にするボタンが押されました', event?.type)
  console.log('イベント詳細:', event)
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  if (confirm('カート内のすべての商品を削除しますか？')) {
    console.log('カートクリアを確認しました')
    await cart.clearCart()
    showMessage('カートを空にしました', 'success')
  } else {
    console.log('カートクリアをキャンセルしました')
  }
}

const proceedToCheckout = () => {
  // カート全体の注文処理画面に遷移
  router.push('/cart-checkout')
}

const showMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
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
  grid-template-columns: 100px 1fr auto auto auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  pointer-events: auto;
  margin-bottom: 1rem;
  background: white;
  position: relative;
}

.item-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
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
  justify-content: center;
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
  position: relative;
  z-index: 10;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.quantity-btn:hover:not(:disabled) {
  background: #1e4220;
}

.quantity-btn:active:not(:disabled),
.quantity-btn:focus:not(:disabled) {
  background: #1e4220;
  transform: scale(0.95);
  outline: none;
}

.quantity-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* タッチデバイス用の追加スタイル */
@media (hover: none) and (pointer: coarse) {
  .quantity-btn:active:not(:disabled) {
    background: #1e4220;
    transform: scale(0.9);
  }
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
  text-align: right;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  transition: background-color 0.3s ease;
  min-width: 80px;
  min-height: 44px;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  position: relative;
  z-index: 10;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.remove-btn:hover {
  background: #c82333;
}

.remove-btn:active,
.remove-btn:focus {
  background: #c82333;
  transform: scale(0.98);
  outline: none;
}

/* タッチデバイス用の追加スタイル */
@media (hover: none) and (pointer: coarse) {
  .remove-btn:active {
    background: #c82333;
    transform: scale(0.95);
  }
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
  transition: background-color 0.3s;
  min-height: 44px;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  position: relative;
  z-index: 10;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.clear-cart-btn {
  background: #6c757d;
  color: white;
}

.clear-cart-btn:hover {
  background: #5a6268;
}

.clear-cart-btn:active,
.clear-cart-btn:focus {
  background: #5a6268;
  transform: scale(0.98);
  outline: none;
}

/* タッチデバイス用の追加スタイル */
@media (hover: none) and (pointer: coarse) {
  .clear-cart-btn:active {
    background: #5a6268;
    transform: scale(0.95);
  }
}

.continue-shopping-btn {
  background: #28a745;
  color: white;
}

.continue-shopping-btn:hover {
  background: #218838;
}

.checkout-btn {
  background: #2c5f2d;
  color: white;
  font-size: 1.1rem;
}

.checkout-btn:hover:not(:disabled) {
  background: #1e4220;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2c5f2d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.message.success {
  border-left: 4px solid #28a745;
  color: #28a745;
}

.message.error {
  border-left: 4px solid #dc3545;
  color: #dc3545;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .shopping-cart-container {
    padding: 1rem;
    margin: 1rem;
  }

  .cart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .cart-item {
    grid-template-columns: 80px 1fr auto;
    grid-template-rows: auto auto auto;
    gap: 0.75rem;
    position: relative;
    padding: 1rem;
  }

  .item-image {
    width: 80px;
    height: 80px;
    grid-row: 1 / 3;
  }

  .item-details {
    grid-column: 2;
    grid-row: 1;
  }

  .item-quantity {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
    margin-top: 0.5rem;
  }

  .item-subtotal {
    grid-column: 1 / -1;
    grid-row: 3;
    text-align: center;
    font-weight: bold;
    color: #2c5f2d;
    margin-top: 0.5rem;
  }

  .remove-btn {
    grid-column: 3;
    grid-row: 1;
    align-self: flex-start;
    font-size: 0.8rem;
    padding: 0.6rem 1rem;
    min-width: 60px;
    min-height: 44px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .clear-cart-btn, .continue-shopping-btn, .checkout-btn {
    width: 100%;
  }
}
</style>
