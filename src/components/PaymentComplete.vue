<template>
  <div class="payment-complete-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>注文を処理しています...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>決済処理中にエラーが発生しました</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="actions">
        <router-link to="/cart" class="btn btn-primary">カートに戻る</router-link>
        <router-link to="/my-orders" class="btn btn-secondary">注文履歴を確認</router-link>
      </div>
    </div>

    <div v-else class="success-state">
      <div class="success-icon">✅</div>
      <h2>ご注文ありがとうございました！</h2>
      <p class="success-message">決済が完了しました。</p>
      
      <div class="order-summary">
        <h3>📦 ご注文内容</h3>
        <div class="order-info">
          <div class="info-row">
            <span class="label">お名前:</span>
            <span class="value">{{ orderData.customerName }}</span>
          </div>
          <div class="info-row">
            <span class="label">メールアドレス:</span>
            <span class="value">{{ orderData.email }}</span>
          </div>
          <div class="info-row">
            <span class="label">配送先:</span>
            <span class="value">{{ orderData.address }}</span>
          </div>
        </div>

        <div class="items-list">
          <div v-for="(item, index) in orderData.items" :key="index" class="item">
            <img :src="item.image" :alt="item.name" class="item-image" />
            <div class="item-details">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">¥{{ item.price.toLocaleString() }} × {{ item.quantity }}</span>
            </div>
            <div class="item-subtotal">
              ¥{{ (item.price * item.quantity).toLocaleString() }}
            </div>
          </div>
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>商品小計:</span>
            <span>¥{{ itemTotal.toLocaleString() }}</span>
          </div>
          <div class="total-row">
            <span>送料 ({{ orderData.shippingRegion }}):</span>
            <span>¥{{ orderData.shippingFee.toLocaleString() }}</span>
          </div>
          <div class="total-row total">
            <span><strong>合計:</strong></span>
            <span><strong>¥{{ orderData.totalAmount.toLocaleString() }}</strong></span>
          </div>
        </div>
      </div>

      <div class="next-steps">
        <h3>📧 今後の流れ</h3>
        <ul>
          <li>ご注文確認メールをお送りいたします</li>
          <li>商品の発送作業を進めさせていただきます</li>
          <li>発送が完了次第、追跡番号をメールでお知らせします</li>
        </ul>
      </div>

      <div class="actions">
        <router-link to="/" class="btn btn-primary">トップページへ</router-link>
        <router-link to="/my-orders" class="btn btn-secondary">注文履歴を確認</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { supabase } from '../lib/supabase.js'

const router = useRouter()
const cart = useCartStore()

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const orderData = ref(null)

const itemTotal = computed(() => {
  if (!orderData.value?.items) return 0
  return orderData.value.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

onMounted(async () => {
  try {
    // localStorageから注文情報を取得
    const pendingOrder = localStorage.getItem('pendingSquareOrder')
    
    if (!pendingOrder) {
      throw new Error('注文情報が見つかりませんでした')
    }

    const parsedOrder = JSON.parse(pendingOrder)
    
    // タイムスタンプをチェック（10分以上経過していたら無効）
    if (Date.now() - parsedOrder.timestamp > 10 * 60 * 1000) {
      throw new Error('注文情報の有効期限が切れています')
    }

    orderData.value = parsedOrder.orderData

    // Edge Functionを呼び出して注文を確定
    if (parsedOrder.cartOrderNumber) {
      const { data, error: completeError } = await supabase.functions.invoke('square-payment-complete', {
        body: {
          cartOrderNumber: parsedOrder.cartOrderNumber,
          squareOrderId: parsedOrder.squareOrderId,
          paymentLinkId: parsedOrder.paymentLinkId,
        }
      })

      if (completeError) {
        console.error('注文確定エラー:', completeError)
        // エラーでも画面は表示する（バックグラウンドで処理）
      } else {
        console.log('注文が確定されました:', data)
      }
    }

    // カートをクリア
    cart.items.splice(0)
    cart.saveCartToStorage()

    // localStorageの注文情報をクリア
    localStorage.removeItem('pendingSquareOrder')

    loading.value = false

  } catch (err) {
    console.error('決済完了処理エラー:', err)
    error.value = true
    errorMessage.value = err.message || '不明なエラーが発生しました'
    loading.value = false
  }
})
</script>

<style scoped>
.payment-complete-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state,
.error-state,
.success-state {
  text-align: center;
  padding: 3rem 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-message,
.success-message {
  font-size: 1.1rem;
  color: #666;
  margin: 1rem 0 2rem;
}

.order-summary {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 2rem;
  margin: 2rem 0;
  text-align: left;
}

.order-summary h3 {
  margin-bottom: 1.5rem;
  color: #333;
}

.order-info {
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-row .label {
  font-weight: 600;
  color: #555;
}

.info-row .value {
  color: #333;
}

.items-list {
  margin: 1.5rem 0;
}

.item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.item-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-name {
  font-weight: 600;
  color: #333;
}

.item-price {
  color: #666;
  font-size: 0.9rem;
}

.item-subtotal {
  font-weight: 600;
  color: #4CAF50;
}

.total-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px solid #ddd;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  color: #555;
}

.total-row.total {
  font-size: 1.2rem;
  color: #333;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.next-steps {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
}

.next-steps h3 {
  margin-bottom: 1rem;
  color: #2e7d32;
}

.next-steps ul {
  list-style: none;
  padding: 0;
}

.next-steps li {
  padding: 0.5rem 0;
  color: #555;
  position: relative;
  padding-left: 1.5rem;
}

.next-steps li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4CAF50;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

@media (max-width: 768px) {
  .payment-complete-container {
    padding: 1rem;
  }

  .item {
    flex-direction: column;
    text-align: center;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
