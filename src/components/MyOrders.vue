<template>
  <div class="my-orders">
    <div class="page-header">
      <router-link to="/" class="back-link">
        <span class="back-arrow">←</span> 商品一覧に戻る
      </router-link>
      <h2>ご注文履歴</h2>
      <!-- デバッグ用：顧客IDを表示（必要に応じてコメントアウト） -->
      <div class="debug-info" v-if="false">
        <small>顧客ID: <code>{{ getOrCreateCustomerId() }}</code></small>
      </div>
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
      <div v-for="orderGroup in groupedOrders" :key="orderGroup.key" class="order-group">
        
        <!-- カート注文の場合は一括表示 -->
        <div v-if="orderGroup.isCartOrder" class="cart-order-card">
          <div class="cart-order-header">
            <div class="cart-order-info">
              <h3>🛒 カート注文: {{ orderGroup.cartGroupId }}</h3>
              <p class="order-date">{{ formatDate(orderGroup.orders[0].created_at) }}</p>
            </div>
            <span :class="['status-badge', orderGroup.orders[0].status]">
              {{ getStatusLabel(orderGroup.orders[0].status) }}
            </span>
          </div>

          <div class="cart-summary">
            <span>{{ orderGroup.orders.length }}商品</span>
            <span class="total-amount">合計: ¥{{ orderGroup.totalAmount.toLocaleString() }}</span>
          </div>

          <!-- カート注文の商品一覧 -->
          <div class="cart-items">
            <div v-for="order in orderGroup.orders" :key="order.id" class="cart-item">
              <img :src="order.product_image" :alt="order.product_name" class="product-thumbnail-small">
              <div class="cart-item-details">
                <span class="product-name">{{ order.product_name }}</span>
                <span class="product-price">¥{{ order.price.toLocaleString() }} × {{ order.quantity || 1 }}</span>
              </div>
              <div class="item-total">¥{{ ((order.price || 0) * (order.quantity || 1)).toLocaleString() }}</div>
            </div>
          </div>

          <!-- カート注文の配送先情報 -->
          <div class="cart-delivery-info">
            <dl class="purchase-details">
              <dt>支払方法</dt>
              <dd>{{ getPaymentMethodLabel(orderGroup.orders[0].payment_method) }}</dd>
              
              <dt>お届け先</dt>
              <dd>{{ orderGroup.orders[0].address?.split('\n[CartGroup:')[0] || orderGroup.orders[0].address }}</dd>

              <template v-if="orderGroup.orders[0].payment_method === 'bank'">
                <dt>支払期限</dt>
                <dd :class="{ 'expired': isPaymentExpired(orderGroup.orders[0]) }">
                  {{ formatDate(orderGroup.orders[0].payment_due_date) }}
                </dd>
              </template>
            </dl>
          </div>

          <!-- カート注文のアクションボタン -->
          <div v-if="shouldShowCartPaymentButton(orderGroup.orders)" class="cart-payment-actions">
            <button 
              @click="confirmCartPayment(orderGroup.orders)"
              class="confirm-button"
              :disabled="isConfirming || isCancelling"
            >
              {{ isConfirming ? '処理中...' : '💳 振込完了' }}
            </button>
            <p class="payment-note">
              ※お振込完了後、上のボタンを押してください
            </p>
            <button 
              @click="cancelCartOrder(orderGroup.orders)"
              class="cancel-button"
              :disabled="isConfirming || isCancelling"
            >
              {{ isCancelling ? '処理中...' : '❌ 注文をキャンセル' }}
            </button>
          </div>

          <!-- カート注文のキャンセルボタン（入金待ち状態） -->
          <div v-else-if="shouldShowCartCancelButton(orderGroup.orders)" class="cart-cancel-actions">
            <div class="pending-payment-message">
              <p>{{ orderGroup.orders[0].payment_method === 'bank' ? '銀行振込でのお支払いをお待ちしております' : 'クレジットカード決済をお待ちしております' }}</p>
              <p class="cancel-note">※ ご都合により注文をキャンセルされる場合は、下記ボタンからお手続きいただけます</p>
            </div>
            <button 
              @click="cancelCartOrder(orderGroup.orders)"
              class="cancel-button"
              :disabled="isCancelling"
            >
              {{ isCancelling ? '処理中...' : '❌ 注文をキャンセル' }}
            </button>
          </div>

          <!-- 入金確認済みの場合 -->
          <div v-if="orderGroup.orders[0].payment_confirmed_by_customer" class="payment-confirmed">
            <p>
              <span class="check-icon">✓</span>
              お振込確認済み（{{ formatDate(orderGroup.orders[0].payment_confirmed_at) }}）
            </p>
          </div>
        </div>        <!-- 通常の単品注文表示 -->
        <div v-else class="order-card">
          <div class="order-header">
            <div class="order-info">
              <h3>注文番号: {{ orderGroup.orders[0].order_number }}</h3>
              <p class="order-date">{{ formatDate(orderGroup.orders[0].created_at) }}</p>
            </div>
            <span :class="['status-badge', orderGroup.orders[0].status]">
              {{ getStatusLabel(orderGroup.orders[0].status) }}
            </span>
          </div>          <div class="product-info">
            <img 
              :src="orderGroup.orders[0].product_image" 
              :alt="orderGroup.orders[0].product_name"
              class="product-image"
            >
            <div class="details">
              <h4>{{ orderGroup.orders[0].product_name }}</h4>
              <p class="price">¥{{ formatPrice(orderGroup.orders[0].price) }}</p>
              
              <dl class="purchase-details">
                <dt>支払方法</dt>
                <dd>{{ getPaymentMethodLabel(orderGroup.orders[0].payment_method) }}</dd>
                
                <dt>お届け先</dt>
                <dd>{{ orderGroup.orders[0].address }}</dd>

                <template v-if="orderGroup.orders[0].payment_method === 'bank'">
                  <dt>支払期限</dt>
                  <dd :class="{ 'expired': isPaymentExpired(orderGroup.orders[0]) }">
                    {{ formatDate(orderGroup.orders[0].payment_due_date) }}
                  </dd>
                </template>
              </dl>
            </div>
          </div>          <!-- 銀行振込かつ未入金の場合 -->
          <div v-if="shouldShowPaymentButton(orderGroup.orders[0])" class="payment-actions">
            <button 
              @click="confirmPayment(orderGroup.orders[0])"
              @touchstart.passive="() => {}"
              class="confirm-button"
              :disabled="isConfirming || isCancelling"
            >
              {{ isConfirming ? '処理中...' : '振込完了' }}
            </button>
            <p class="payment-note">
              ※お振込完了後、上のボタンを押してください
            </p>
            <button 
              @click="cancelOrder(orderGroup.orders[0])"
              class="cancel-button"
              :disabled="isConfirming || isCancelling"
            >
              {{ isCancelling ? '処理中...' : '注文をキャンセル' }}
            </button>
          </div>

          <!-- お支払い待ち状態でキャンセルボタン表示 -->
          <div v-else-if="shouldShowCancelButton(orderGroup.orders[0])" class="cancel-actions">
            <div class="pending-payment-message">
              <p>{{ orderGroup.orders[0].payment_method === 'bank' ? '銀行振込でのお支払いをお待ちしております' : 'クレジットカード決済をお待ちしております' }}</p>
              <p class="cancel-note">※ ご都合により注文をキャンセルされる場合は、下記ボタンからお手続きいただけます</p>
            </div>
            <button 
              @click="cancelOrder(orderGroup.orders[0])"
              class="cancel-button"
              :disabled="isCancelling"
            >
              {{ isCancelling ? '処理中...' : '注文をキャンセル' }}
            </button>
          </div>

          <!-- 入金確認済みの場合 -->
          <div v-if="orderGroup.orders[0].payment_confirmed_by_customer" class="payment-confirmed">
            <p>
              <span class="check-icon">✓</span>
              お振込確認済み（{{ formatDate(orderGroup.orders[0].payment_confirmed_at) }}）
            </p>
          </div>
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
import { getOrCreateCustomerId, fetchCustomerOrders } from '../lib/customer.js'
import { sendPaymentConfirmationEmail } from '../lib/postmark.js' // メール送信機能を有効化

const router = useRouter()
const orders = ref([])
const groupedOrders = ref([])
const loading = ref(true)
const error = ref(null)
const isConfirming = ref(false)
const isCancelling = ref(false)

// 注文履歴を取得
const fetchOrders = async () => {
  loading.value = true
  error.value = null
  
  try {
    // 現在の顧客IDを取得
    const customerId = getOrCreateCustomerId()
    
    // 顧客IDでフィルタリングして注文履歴を取得
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
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

    // 注文をグループ化（カート注文と通常注文を分ける）
    groupOrders()
  } catch (e) {
    console.error('注文履歴の取得に失敗:', e)
    error.value = '注文履歴の取得に失敗しました。'
  } finally {
    loading.value = false
  }
}

// お振込完了報告
const confirmPayment = async (order) => {
  // スマホ対応: より確実な確認方法
  const userConfirmed = window.confirm('お振込の完了を報告しますか？\n\n※この操作は取り消しできません。')
  if (!userConfirmed) return

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
    
    // 入金確認メールを送信（有効化）
    try {
      // 住所から送料情報を抽出
      const { extractShippingInfoFromAddress } = await import('../lib/shipping.js')
      const shippingInfo = extractShippingInfoFromAddress(order.address, order.price)
      
      // メール送信用に送料情報を追加
      const orderWithShipping = {
        ...order,
        shipping_fee: shippingInfo.shippingFee,
        shipping_region: shippingInfo.region,
        item_price: shippingInfo.itemPrice
      }
      
      await sendPaymentConfirmationEmail(orderWithShipping)
    } catch (emailError) {
      // メール送信に失敗してもエラーにしない
    }

    await fetchOrders() // 注文リストを再取得して表示を更新
  } catch (e) {
    console.error('お振込完了報告に失敗:', e)
    // スマホ対応: より詳細なエラーメッセージ
    const errorMessage = e?.message || 'お振込完了報告に失敗しました。'
    alert(`エラーが発生しました:\n${errorMessage}\n\nネットワーク接続を確認して、もう一度お試しください。`)
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

// 注文をグループ化する関数
const groupOrders = () => {
  const orderMap = new Map()

  orders.value.forEach(order => {
    // カートグループIDを抽出
    const cartGroupId = extractCartGroupId(order)
    
    if (cartGroupId) {
      // カート注文の場合
      if (orderMap.has(cartGroupId)) {
        orderMap.get(cartGroupId).orders.push(order)
      } else {
        orderMap.set(cartGroupId, {
          key: cartGroupId,
          isCartOrder: true,
          cartGroupId: cartGroupId,
          orders: [order],
          totalAmount: 0
        })
      }
    } else {
      // 通常の単品注文の場合
      orderMap.set(order.id, {
        key: order.id,
        isCartOrder: false,
        orders: [order],
        totalAmount: order.price * (order.quantity || 1)
      })
    }
  })

  // 合計金額を計算
  orderMap.forEach(group => {
    if (group.isCartOrder) {
      group.totalAmount = group.orders.reduce((sum, order) => 
        sum + (order.price * (order.quantity || 1)), 0
      )
    }
  })

  // 作成日時でソート（新しい順）
  groupedOrders.value = Array.from(orderMap.values()).sort((a, b) => {
    const aDate = new Date(a.orders[0].created_at)
    const bDate = new Date(b.orders[0].created_at)
    return bDate - aDate
  })
}

// カートグループIDを抽出するヘルパー関数
const extractCartGroupId = (order) => {
  // addressフィールドから[CartGroup:xxxx]を抽出
  const groupMatch = order.address?.match(/\[CartGroup:(CART\d+[A-Z0-9]*)\]/)
  if (groupMatch) {
    return groupMatch[1]
  }
  
  // 注文番号がCARTxxx_xの形式の場合
  if (order.order_number && order.order_number.match(/^CART\d+[A-Z0-9]*_\d+$/)) {
    return order.order_number.split('_')[0]
  }
  
  return null
}

// カート注文の振込完了処理
const confirmCartPayment = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  const totalAmount = cartOrders.reduce((sum, order) => sum + (order.price * (order.quantity || 1)), 0)
  
  const confirmMessage = `🛒 カート注文の振込完了を報告しますか？\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `💰 合計金額: ¥${totalAmount.toLocaleString()}\n\n` +
    `※この操作は取り消しできません。`
  
  if (!confirm(confirmMessage)) return

  isConfirming.value = true

  try {
    // 全ての注文の状態を一括更新
    const orderIds = cartOrders.map(order => order.id)
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        payment_confirmed_by_customer: true,
        payment_confirmed_at: new Date().toISOString(),
        status: 'paid'
      })
      .in('id', orderIds)

    if (orderError) throw orderError

    await fetchOrders()
    alert(`✅ カート注文の振込完了を報告しました\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品`)
  } catch (error) {
    console.error('カート注文振込完了処理に失敗しました:', error)
    alert('❌ エラーが発生しました。もう一度お試しください。')
  } finally {
    isConfirming.value = false
  }
}

// カート注文のキャンセル処理
const cancelCartOrder = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  const totalAmount = cartOrders.reduce((sum, order) => sum + (order.price * (order.quantity || 1)), 0)
  
  const confirmMessage = `🛒 カート注文をキャンセルしますか？\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `💰 合計金額: ¥${totalAmount.toLocaleString()}\n\n` +
    `⚠️ この操作により在庫が元に戻されます。\n` +
    `※キャンセル後は復元できません。`
  
  if (!confirm(confirmMessage)) return

  isCancelling.value = true

  try {
    // 全ての注文をキャンセル状態に更新
    const orderIds = cartOrders.map(order => order.id)
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)

    if (orderError) throw orderError

    // 在庫を元に戻す
    for (const order of cartOrders) {
      const { data: product, error: productError } = await supabase
        .from('succulents')
        .select('quantity')
        .eq('id', order.product_id)
        .single()

      if (!productError && product) {
        await supabase
          .from('succulents')
          .update({ 
            quantity: product.quantity + (order.quantity || 1)
          })
          .eq('id', order.product_id)
      }
    }

    await fetchOrders()
    alert(`✅ カート注文をキャンセルしました\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n\n在庫を復元しました。`)
  } catch (error) {
    console.error('カート注文キャンセル処理に失敗しました:', error)
    alert('❌ エラーが発生しました。もう一度お試しください。')
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

// カート注文の支払いボタンを表示すべきかどうか
const shouldShowCartPaymentButton = (cartOrders) => {
  const firstOrder = cartOrders[0]
  return (
    firstOrder.payment_method === 'bank' && 
    !firstOrder.payment_confirmed_by_customer &&
    !isPaymentExpired(firstOrder) &&
    firstOrder.status !== 'cancelled'
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

// カート注文のキャンセルボタンを表示すべきかどうか
const shouldShowCartCancelButton = (cartOrders) => {
  const firstOrder = cartOrders[0]
  return (
    firstOrder.status === 'pending_payment' &&
    firstOrder.status !== 'cancelled' &&
    !firstOrder.payment_confirmed_by_customer
  )
}

onMounted(fetchOrders)
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
  text-align: left;
}

.page-header h2 {
  color: #2c5f2d;
  margin: 1rem 0;
  font-size: 2rem;
  font-weight: bold;
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
  color: #333; /* 基本的な文字色を濃くする */
}

.loading, .error, .no-orders {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: #333; /* 文字色を濃くする */
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
  color: #333; /* カード内の文字色を濃くする */
}

/* カート注文のスタイル */
.cart-order-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  border-left: 4px solid #4CAF50;
}

.cart-order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.cart-order-info h3 {
  color: #2c5f2d;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.cart-order-info .order-date {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  color: #333;
  font-weight: 500;
}

.cart-summary .total-amount {
  font-weight: bold;
  color: #2c5f2d;
  font-size: 1.1rem;
}

.cart-items {
  margin-bottom: 1.5rem;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #fafafa;
  border-radius: 6px;
}

.product-thumbnail-small {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.cart-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cart-item-details .product-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.cart-item-details .product-price {
  color: #666;
  font-size: 0.9rem;
}

.cart-item .item-total {
  font-weight: bold;
  color: #2c5f2d;
}

.cart-delivery-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  color: #333;
}

.cart-delivery-info .purchase-details dt {
  color: #555;
  font-weight: bold;
}

.cart-delivery-info .purchase-details dd {
  color: #333;
}

.cart-payment-actions, .cart-cancel-actions {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  text-align: center;
  border: 2px solid #e9ecef;
}

.cart-payment-actions .confirm-button,
.cart-payment-actions .cancel-button,
.cart-cancel-actions .cancel-button {
  margin: 0.5rem;
  min-width: 140px;
}

.cart-payment-actions .confirm-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cart-payment-actions .confirm-button:hover:not(:disabled) {
  background: #388E3C;
}

.cart-payment-actions .cancel-button,
.cart-cancel-actions .cancel-button {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cart-payment-actions .cancel-button:hover:not(:disabled),
.cart-cancel-actions .cancel-button:hover:not(:disabled) {
  background: #d32f2f;
}

/* 文字色の改善 */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.order-info h3 {
  color: #2c5f2d;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.order-date {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.product-info {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.product-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.details h4 {
  color: #2c5f2d;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: bold;
}

.details .price {
  color: #e67e22;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.purchase-details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
}

.purchase-details dt {
  font-weight: bold;
  color: #555;
  margin: 0;
}

.purchase-details dd {
  color: #333;
  margin: 0;
  word-break: break-word;
}

.purchase-details dd.expired {
  color: #e74c3c;
  font-weight: bold;
}

/* ステータスバッジの改善 */
.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  text-align: center;
  white-space: nowrap;
}

.status-badge.pending_payment {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-badge.paid {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-badge.cancelled {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status-badge.completed {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-badge.shipped {
  background: #e2e3e5;
  color: #383d41;
  border: 1px solid #d6d8db;
}

/* ボタンとアクション部分の改善 */
.payment-actions, .cancel-actions {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #dee2e6;
  margin-top: 1rem;
}

.pending-payment-message {
  margin-bottom: 1rem;
}

.pending-payment-message p {
  color: #495057;
  margin: 0.5rem 0;
  line-height: 1.4;
}

.cancel-note {
  font-size: 0.9rem;
  color: #6c757d;
}

.payment-note {
  color: #495057;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.confirm-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin: 0.5rem;
}

.confirm-button:hover:not(:disabled) {
  background: #218838;
}

.confirm-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.cancel-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin: 0.5rem;
}

.cancel-button:hover:not(:disabled) {
  background: #c82333;
}

.cancel-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.payment-confirmed {
  background: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #c3e6cb;
}

.check-icon {
  color: #28a745;
  font-weight: bold;
  margin-right: 0.5rem;
}

/* レスポンシブ対応 */
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

  .cart-order-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .cart-summary {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .cart-item {
    flex-direction: column;
    text-align: center;
  }

  .cart-payment-actions, .cart-cancel-actions {
    padding: 1rem;
  }

  .cart-payment-actions .confirm-button,
  .cart-payment-actions .cancel-button,
  .cart-cancel-actions .cancel-button {
    width: 100%;
    margin: 0.25rem 0;
    min-width: auto;
  }
}
</style>
