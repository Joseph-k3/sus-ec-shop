<template>
  <div class="order-management">
    <h2>注文管理</h2>
    
    <div class="filter-section">
      <select v-model="statusFilter">
        <option value="all">全ての注文</option>
        <option value="pending_payment">入金待ち</option>
        <option value="paid">入金済み</option>
        <option value="shipped">発送済み</option>
        <option value="completed">完了</option>
        <option value="cancelled">キャンセル</option>
      </select>
    </div>

    <div class="orders-list">
      <div v-for="order in filteredOrders" :key="order.id" class="order-card">
        <div class="order-header">
          <h3>注文番号: {{ order.order_number }}</h3>
          <span :class="['status-badge', order.status]">{{ getStatusLabel(order.status) }}</span>
        </div>

        <div class="order-details">
          <div class="product-info">
            <img :src="order.product_image" :alt="order.product_name" class="product-thumbnail">
            <div>
              <h4>{{ order.product_name }}</h4>
              <p class="price">¥{{ order.price.toLocaleString() }}</p>
            </div>
          </div>

          <div class="customer-info">
            <p><strong>購入者:</strong> {{ order.customer_name }}</p>
            <p><strong>メール:</strong> {{ order.email }}</p>
            <p><strong>電話:</strong> {{ order.phone }}</p>
            <p><strong>住所:</strong> {{ order.address }}</p>
          </div>

          <div class="payment-info">
            <p><strong>支払方法:</strong> {{ order.payment_method === 'bank' ? '銀行振込' : 'Square決済' }}</p>
            <p v-if="order.payment_method === 'bank'">
              <strong>支払期限:</strong> {{ formatDate(order.payment_due_date) }}
            </p>
          </div>
        </div>

        <div class="order-actions">
          <template v-if="order.status === 'pending_payment'">
            <button 
              class="action-button confirm-payment" 
              @click="confirmPayment(order)"
            >
              入金確認
            </button>
            <button 
              class="action-button cancel-order" 
              @click="cancelOrder(order)"
            >
              キャンセル
            </button>
          </template>

          <template v-if="order.status === 'paid'">
            <button 
              class="action-button confirm-shipment" 
              @click="confirmShipment(order)"
            >
              発送完了
            </button>
          </template>

          <template v-if="order.status === 'shipped'">
            <button 
              class="action-button complete-order" 
              @click="completeOrder(order)"
            >
              取引完了
            </button>
          </template>

          <template v-if="order.status === 'cancelled'">
            <button 
              class="action-button cancelled-order" 
              disabled
            >
              キャンセル済み
            </button>
          </template>

          <template v-if="order.status === 'completed' && order.stock_after_sale === 0">
            <button 
              class="action-button delete-product warning" 
              @click="deleteProduct(order)"
            >
              商品を完全削除
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

const orders = ref([])
const statusFilter = ref('all')

// ステータスラベルの取得
const getStatusLabel = (status) => {
  const labels = {
    'pending_payment': '入金待ち',
    'paid': '入金済み',
    'shipped': '発送済み',
    'completed': '完了',
    'cancelled': 'キャンセル'
  }
  return labels[status] || status
}

// 日付のフォーマット
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// フィルター適用された注文リスト
const filteredOrders = computed(() => {
  if (statusFilter.value === 'all') {
    return orders.value
  }
  return orders.value.filter(order => order.status === statusFilter.value)
})

// 注文データの取得
const fetchOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    orders.value = data
  } catch (error) {
    console.error('注文データの取得に失敗しました:', error)
  }
}

// 入金確認処理
const confirmPayment = async (order) => {
  if (!confirm(`注文番号: ${order.order_number} の入金を確認しましたか？`)) return

  try {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (orderError) throw orderError

    await fetchOrders()
    alert('入金を確認しました。発送の準備を開始してください。')
  } catch (error) {
    console.error('入金確認処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// 発送完了処理
const confirmShipment = async (order) => {
  if (!confirm(`注文番号: ${order.order_number} の商品を発送しましたか？`)) return

  try {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (orderError) throw orderError

    await fetchOrders()
    alert('発送完了を記録しました。')
  } catch (error) {
    console.error('発送完了処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// 取引完了処理
const completeOrder = async (order) => {
  if (!confirm(`注文番号: ${order.order_number} の取引を完了としますか？`)) return

  try {
    // 在庫数を確認
    const { data: product, error: productError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', order.product_id)
      .single()

    if (productError) throw productError

    const stockAfterSale = product.quantity - order.quantity

    // 注文を完了状態に更新
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'completed',
        stock_after_sale: stockAfterSale,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (orderError) throw orderError

    await fetchOrders()
    alert('取引を完了しました。' + (stockAfterSale === 0 ? '\n在庫が0になりました。商品を完全に削除できます。' : ''))
  } catch (error) {
    console.error('取引完了処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// 商品完全削除処理
const deleteProduct = async (order) => {
  if (!confirm(`この商品（${order.product_name}）を完全に削除しますか？\nこの操作は取り消せません。`)) return

  try {
    // 商品の情報を取得（画像パスなど）
    const { data: product, error: productError } = await supabase
      .from('succulents')
      .select('image_path')
      .eq('id', order.product_id)
      .single()

    if (productError) throw productError

    // 商品画像の削除
    if (product.image_path) {
      const { error: storageError } = await supabase
        .storage
        .from('succulents')
        .remove([product.image_path])

      if (storageError) {
        console.error('画像の削除に失敗しました:', storageError)
      }
    }

    // 商品を削除（トリガーにより関連注文のproduct_deletedフラグが更新される）
    const { error: deleteError } = await supabase
      .from('succulents')
      .delete()
      .eq('id', order.product_id)

    if (deleteError) throw deleteError

    await fetchOrders()
    alert('商品を完全に削除しました。')
  } catch (error) {
    console.error('商品削除処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// 注文キャンセル処理
const cancelOrder = async (order) => {
  if (!confirm(`注文番号: ${order.order_number} をキャンセルしますか？\n在庫は自動的に戻されます。`)) return

  try {
    // 注文をキャンセル
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (orderError) throw orderError

    // 在庫を戻す
    const { data: stockData, error: stockError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', order.product_id)
      .single()

    if (stockError) throw stockError

    const { error: updateError } = await supabase
      .from('succulents')
      .update({ 
        quantity: stockData.quantity + order.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.product_id)

    if (updateError) throw updateError

    await fetchOrders()
    alert('注文をキャンセルし、在庫を戻しました。')
  } catch (error) {
    console.error('キャンセル処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// 初期データ取得
onMounted(fetchOrders)
</script>

<style scoped>
.order-management {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.filter-section {
  margin-bottom: 2rem;
}

.filter-section select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
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
  align-items: center;
  margin-bottom: 1rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: bold;
}

.status-badge.pending_payment {
  background: #fff3cd;
  color: #856404;
}

.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.shipped {
  background: #cce5ff;
  color: #004085;
}

.status-badge.completed {
  background: #e2e3e5;
  color: #383d41;
}

.status-badge.cancelled {
  background: #f8d7da;
  color: #721c24;
}

.order-details {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.product-info {
  display: flex;
  gap: 1rem;
}

.product-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.order-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-button:hover {
  opacity: 0.9;
}

.confirm-payment {
  background: #28a745;
  color: white;
}

.confirm-shipment {
  background: #007bff;
  color: white;
}

.complete-order {
  background: #6c757d;
  color: white;
}

.cancel-order {
  background: #dc3545;
  color: white;
}

.cancelled-order {
  background: #6c757d;
  color: white;
  cursor: not-allowed;
  opacity: 0.6;
}

.cancelled-order:hover {
  opacity: 0.6;
}

.delete-product {
  background: #dc3545;
  color: white;
}

.delete-product.warning {
  background-color: #dc3545;
  color: white;
}

.delete-product.warning:hover {
  background-color: #c82333;
}

@media (max-width: 768px) {
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .order-actions {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
  }
}
</style>
