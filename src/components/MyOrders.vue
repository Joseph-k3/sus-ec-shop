<template>
  <div class="my-orders">
    <div class="page-header">
      <router-link to="/" class="back-link">
        <span class="back-arrow">←</span> 商品一覧に戻る
      </router-link>
      <h2>ご注文履歴</h2>
    </div>
    
    <div v-if="loading" class="loading">
      読み込み中...
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchOrders" class="retry-button">
        再読み込み
      </button>
    </div>

    <div v-else-if="orders.length === 0" class="no-orders">
      <p>注文履歴がありません。</p>
      <router-link to="/" class="primary-button">
        商品一覧に戻る
      </router-link>
    </div>

    <div v-else class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <div class="order-info">
            <h3>注文番号: {{ order.order_number }}</h3>
            <p class="order-date">{{ formatDate(order.created_at) }}</p>
          </div>
          <span :class="['status-badge', order.status]">
            {{ getStatusLabel(order.status) }}
          </span>
        </div>

        <div class="product-info">
          <img 
            :src="order.product_image" 
            :alt="order.product_name"
            class="product-image"
          >
          <div class="details">
            <h4>{{ order.product_name }}</h4>
            <p class="price">¥{{ formatPrice(order.price) }}</p>
            
            <dl class="purchase-details">
              <dt>支払方法</dt>
              <dd>{{ getPaymentMethodLabel(order.payment_method) }}</dd>
              
              <dt>お届け先</dt>
              <dd>{{ order.address }}</dd>

              <template v-if="order.payment_method === 'bank'">
                <dt>支払期限</dt>
                <dd :class="{ 'expired': isPaymentExpired(order) }">
                  {{ formatDate(order.payment_due_date) }}
                </dd>
              </template>
            </dl>
          </div>
        </div>

        <!-- 銀行振込かつ未入金の場合 -->
        <div v-if="shouldShowPaymentButton(order)" class="payment-actions">
          <button 
            @click="confirmPayment(order)"
            class="confirm-button"
            :disabled="isConfirming || isCancelling"
          >
            {{ isConfirming ? '処理中...' : '振込完了' }}
          </button>
          <p class="payment-note">
            ※お振込完了後、上のボタンを押してください
          </p>
          <button 
            @click="cancelOrder(order)"
            class="cancel-button"
            :disabled="isConfirming || isCancelling"
          >
            {{ isCancelling ? '処理中...' : '注文をキャンセル' }}
          </button>
        </div>

        <!-- お支払い待ち状態でキャンセルボタン表示 -->
        <div v-else-if="shouldShowCancelButton(order)" class="cancel-actions">
          <div class="pending-payment-message">
            <p>{{ order.payment_method === 'bank' ? '銀行振込でのお支払いをお待ちしております' : 'クレジットカード決済をお待ちしております' }}</p>
            <p class="cancel-note">※ ご都合により注文をキャンセルされる場合は、下記ボタンからお手続きいただけます</p>
          </div>
          <button 
            @click="cancelOrder(order)"
            class="cancel-button"
            :disabled="isCancelling"
          >
            {{ isCancelling ? '処理中...' : '注文をキャンセル' }}
          </button>
        </div>

        <!-- 入金確認済みの場合 -->
        <div v-if="order.payment_confirmed_by_customer" class="payment-confirmed">
          <p>
            <span class="check-icon">✓</span>
            お振込確認済み（{{ formatDate(order.payment_confirmed_at) }}）
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import getPublicImageUrl from '../lib/imageUtils.js'
import { sendPaymentConfirmationEmail } from '../lib/postmark.js'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const error = ref(null)
const isConfirming = ref(false)
const isCancelling = ref(false)

// 注文履歴を取得
const fetchOrders = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError

    // キャンセル済み注文で1日以上経過したものを除外
    // SupabaseはUTCで保存されているため、日本時間（JST）で計算
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24時間前
    
    const filteredOrders = data.filter(order => {
      if (order.status === 'cancelled') {
        const updatedAt = new Date(order.updated_at)
        return updatedAt > oneDayAgo // 24時間以内のキャンセル注文のみ表示
      }
      return true // キャンセル以外の注文は全て表示
    })

    // 画像URLを公開URLに変換
    orders.value = filteredOrders.map(order => ({
      ...order,
      product_image: getPublicImageUrl(order.product_image)
    }))
  } catch (e) {
    console.error('注文履歴の取得に失敗:', e)
    error.value = '注文履歴の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// お振込完了報告
const confirmPayment = async (order) => {
  if (!confirm('お振込の完了を報告しますか？')) return

  isConfirming.value = true

  try {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_confirmed_by_customer: true,
        payment_confirmed_at: new Date().toISOString(),
        status: 'paid' // ステータスを「支払い済み」に更新
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    console.log('入金確認メール送信を開始します...')
    
    // 入金確認メールを送信
    try {
      await sendPaymentConfirmationEmail(order)
      console.log('入金確認メールの送信が完了しました')
    } catch (emailError) {
      console.error('入金確認メール送信エラー:', emailError)
      // メール送信に失敗してもエラーにしない
      console.warn('入金確認メール送信に失敗しましたが、入金確認は正常に完了しました')
    }

    await fetchOrders() // 注文リストを再取得して表示を更新
  } catch (e) {
    console.error('お振込完了報告に失敗:', e)
    alert('お振込完了報告に失敗しました。')
  } finally {
    isConfirming.value = false
  }
}

// 注文キャンセル
const cancelOrder = async (order) => {
  const paymentMethod = order.payment_method === 'bank' ? '銀行振込' : 'クレジットカード決済'
  
  if (!confirm(
    `この注文をキャンセルしますか？\n\n` +
    `商品：${order.product_name}\n` +
    `金額：¥${order.price.toLocaleString()}\n` +
    `決済方法：${paymentMethod}\n\n` +
    `※ キャンセル後は復元できません。`
  )) return

  isCancelling.value = true

  try {
    // 注文をキャンセル状態に更新
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    // 在庫を復元
    const { data: currentStock, error: stockFetchError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', order.product_id)
      .single()

    if (stockFetchError) {
      console.error('在庫取得エラー:', stockFetchError)
    } else {
      const { error: stockError } = await supabase
        .from('succulents')
        .update({
          quantity: currentStock.quantity + (order.quantity || 1)
        })
        .eq('id', order.product_id)

      if (stockError) {
        console.error('在庫復元エラー:', stockError)
        // 在庫復元に失敗してもキャンセルは成功とする
      }
    }

    await fetchOrders() // 注文リストを再取得して表示を更新
    alert('注文をキャンセルしました。')
  } catch (e) {
    console.error('注文キャンセルに失敗:', e)
    alert('注文キャンセルに失敗しました。')
  } finally {
    isCancelling.value = false
  }
}

// ステータスラベルの取得
const getStatusLabel = (status) => {
  const labels = {
    pending_payment: 'お支払い待ち',
    paid: '入金済み',
    cancelled: 'キャンセル済み',
    completed: '取引完了'
  }
  return labels[status] || status
}

// 支払方法のラベル取得
const getPaymentMethodLabel = (method) => {
  const labels = {
    bank: '銀行振込',
    square: 'クレジットカード'
  }
  return labels[method] || method
}

// 日付フォーマット
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 価格フォーマット
const formatPrice = (price) => {
  return Number(price).toLocaleString()
}

// 支払い期限切れかどうか
const isPaymentExpired = (order) => {
  if (!order.payment_due_date) return false
  return new Date(order.payment_due_date) < new Date()
}

// 支払いボタンを表示すべきかどうか
const shouldShowPaymentButton = (order) => {
  return (
    order.payment_method === 'bank' && 
    !order.payment_confirmed_by_customer &&
    !isPaymentExpired(order) &&
    order.status !== 'cancelled'
  )
}

// キャンセルボタンを表示すべきかどうか（入金待ち注文）
const shouldShowCancelButton = (order) => {
  return (
    order.status === 'pending_payment' &&
    order.status !== 'cancelled' &&
    !order.payment_confirmed_by_customer
    // 期限切れ条件を削除：入金待ち状態であれば常にキャンセル可能
  )
}

onMounted(fetchOrders)
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
  text-align: left;
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: white;
  background: #4CAF50;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-link:hover {
  background: #388E3C;
}

.back-arrow {
  margin-right: 0.5rem;
}

.my-orders {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.loading, .error, .no-orders {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.orders-list {
  display: grid;
  gap: 1.5rem;
}

.order-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.order-info h3 {
  margin: 0;
  color: #333;
}

.order-date {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9rem;
}

.status-badge.pending_payment {
  background: #fff3cd;
  color: #856404;
}

.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.cancelled {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.completed {
  background: #cce5ff;
  color: #004085;
}

.product-info {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
}

.product-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
}

.details {
  flex: 1;
}

.details h4 {
  margin: 0 0 0.5rem;
  color: #333;
}

.price {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0 0 1rem;
}

.purchase-details {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.5rem;
  margin: 0;
}

.purchase-details dt {
  color: #666;
  font-weight: 500;
}

.purchase-details dd {
  margin: 0;
  color: #333;
}

.expired {
  color: #dc3545;
}

.payment-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  display: grid;
  gap: 0.5rem;
}

.cancel-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.pending-payment-message {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.pending-payment-message p {
  margin: 0.5rem 0;
  color: #333;
}

.cancel-note {
  font-size: 0.9rem;
  color: #666 !important;
  font-style: italic;
}

.confirm-button {
  width: 100%;
  padding: 0.75rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-button:hover {
  background: #388E3C;
}

.confirm-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-button {
  width: 100%;
  padding: 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: #c82333;
}

.cancel-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.payment-note {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}

.payment-confirmed {
  margin-top: 1rem;
  padding: 1rem;
  background: #d4edda;
  border-radius: 4px;
  color: #155724;
}

.check-icon {
  margin-right: 0.5rem;
}

.retry-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
}

.primary-button {
  display: inline-block;
  background: #4CAF50;
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .my-orders {
    padding: 1rem;
  }

  .order-header {
    flex-direction: column;
  }

  .status-badge {
    margin-top: 1rem;
    width: 100%;
    text-align: center;
  }

  .product-info {
    flex-direction: column;
  }

  .product-image {
    width: 100%;
    height: 200px;
  }

  .purchase-details {
    grid-template-columns: 1fr;
  }

  .purchase-details dd {
    margin-bottom: 1rem;
  }
}
</style>
