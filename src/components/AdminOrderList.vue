<template>
  <div class="admin-order-list">
    <div class="header-section">
      <h2>注文管理</h2>
      <div class="filter-section">
        <select v-model="statusFilter" @change="fetchOrders" class="status-filter">
          <option value="all">全て</option>
          <option value="pending">決済待ち</option>
          <option value="paid">決済完了</option>
          <option value="refunded">返金済み</option>
        </select>
        <button @click="fetchOrders" class="refresh-btn">
          <i class="fas fa-sync-alt"></i> 更新
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <i class="fas fa-spinner fa-spin"></i> 読み込み中...
    </div>

    <div v-else-if="orders.length === 0" class="no-orders">
      注文がありません
    </div>

    <div v-else class="table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>注文番号</th>
            <th>注文日時</th>
            <th>顧客名</th>
            <th>商品名</th>
            <th>数量</th>
            <th>金額</th>
            <th>決済ID</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" :class="{ 'refunded-row': order.refunded }">
            <td>
              <span class="order-number">{{ order.order_number }}</span>
            </td>
            <td>{{ formatDate(order.created_at) }}</td>
            <td>
              <div class="customer-info">
                <strong>{{ order.customer_name }}</strong>
                <small>{{ order.email }}</small>
                <small>{{ order.phone }}</small>
              </div>
            </td>
            <td>{{ order.product_name }}</td>
            <td class="text-center">{{ order.quantity }}</td>
            <td class="text-right">¥{{ formatPrice(order.price * order.quantity) }}</td>
            <td>
              <span v-if="order.square_payment_id" class="payment-id">
                {{ order.square_payment_id.substring(0, 12) }}...
              </span>
              <span v-else class="no-payment">未決済</span>
            </td>
            <td>
              <span :class="['status-badge', `status-${order.status}`]">
                {{ getStatusText(order.status, order.refunded) }}
              </span>
              <span v-if="order.refunded" class="refund-badge">返金済</span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  v-if="canRefund(order)"
                  @click="openRefundDialog(order)"
                  class="refund-btn"
                  :disabled="refunding"
                >
                  <i class="fas fa-undo"></i> 返金
                </button>
                <span v-else-if="order.refunded" class="refunded-info">
                  <small>返金日: {{ formatDate(order.refunded_at) }}</small>
                  <small v-if="order.refund_reason">理由: {{ order.refund_reason }}</small>
                </span>
                <button
                  @click="viewOrderDetails(order)"
                  class="view-btn"
                >
                  <i class="fas fa-eye"></i> 詳細
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 返金確認ダイアログ -->
    <div v-if="refundDialog.show" class="modal-overlay" @click.self="closeRefundDialog">
      <div class="modal-content">
        <h3>返金確認</h3>
        <div class="refund-details">
          <p><strong>注文番号:</strong> {{ refundDialog.order?.order_number }}</p>
          <p><strong>顧客名:</strong> {{ refundDialog.order?.customer_name }}</p>
          <p><strong>商品:</strong> {{ refundDialog.order?.product_name }} × {{ refundDialog.order?.quantity }}</p>
          <p><strong>返金額:</strong> ¥{{ formatPrice(refundDialog.order?.price * refundDialog.order?.quantity) }}</p>
        </div>
        <div class="form-group">
          <label for="refund-reason">返金理由 (必須):</label>
          <textarea
            id="refund-reason"
            v-model="refundDialog.reason"
            placeholder="例: 注文重複のため、在庫不足による返金、等"
            rows="3"
            class="refund-reason-input"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button @click="closeRefundDialog" class="cancel-btn" :disabled="refunding">
            キャンセル
          </button>
          <button 
            @click="executeRefund" 
            class="confirm-refund-btn" 
            :disabled="refunding || !refundDialog.reason.trim()"
          >
            <i v-if="refunding" class="fas fa-spinner fa-spin"></i>
            {{ refunding ? '処理中...' : '返金実行' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 注文詳細ダイアログ -->
    <div v-if="detailsDialog.show" class="modal-overlay" @click.self="closeDetailsDialog">
      <div class="modal-content details-modal">
        <h3>注文詳細</h3>
        <div v-if="detailsDialog.order" class="order-details">
          <section>
            <h4>基本情報</h4>
            <p><strong>注文番号:</strong> {{ detailsDialog.order.order_number }}</p>
            <p><strong>注文ID:</strong> {{ detailsDialog.order.id }}</p>
            <p><strong>注文日時:</strong> {{ formatDate(detailsDialog.order.created_at) }}</p>
            <p><strong>ステータス:</strong> {{ getStatusText(detailsDialog.order.status, detailsDialog.order.refunded) }}</p>
          </section>

          <section>
            <h4>顧客情報</h4>
            <p><strong>氏名:</strong> {{ detailsDialog.order.customer_name }}</p>
            <p><strong>メール:</strong> {{ detailsDialog.order.email }}</p>
            <p><strong>電話:</strong> {{ detailsDialog.order.phone }}</p>
            <p><strong>住所:</strong> {{ detailsDialog.order.address }}</p>
            <p v-if="detailsDialog.order.notes"><strong>備考:</strong> {{ detailsDialog.order.notes }}</p>
          </section>

          <section>
            <h4>商品情報</h4>
            <p><strong>商品名:</strong> {{ detailsDialog.order.product_name }}</p>
            <p><strong>数量:</strong> {{ detailsDialog.order.quantity }}個</p>
            <p><strong>単価:</strong> ¥{{ formatPrice(detailsDialog.order.price) }}</p>
            <p><strong>合計:</strong> ¥{{ formatPrice(detailsDialog.order.price * detailsDialog.order.quantity) }}</p>
          </section>

          <section>
            <h4>決済情報</h4>
            <p><strong>決済方法:</strong> {{ detailsDialog.order.payment_method }}</p>
            <p v-if="detailsDialog.order.square_payment_id"><strong>Square決済ID:</strong> {{ detailsDialog.order.square_payment_id }}</p>
            <p v-if="detailsDialog.order.square_order_id"><strong>Square注文ID:</strong> {{ detailsDialog.order.square_order_id }}</p>
            <p v-if="detailsDialog.order.paid_at"><strong>決済完了日時:</strong> {{ formatDate(detailsDialog.order.paid_at) }}</p>
          </section>

          <section v-if="detailsDialog.order.refunded">
            <h4>返金情報</h4>
            <p><strong>返金ID:</strong> {{ detailsDialog.order.refund_id }}</p>
            <p><strong>返金理由:</strong> {{ detailsDialog.order.refund_reason }}</p>
            <p><strong>返金日時:</strong> {{ formatDate(detailsDialog.order.refunded_at) }}</p>
          </section>
        </div>
        <div class="modal-actions">
          <button @click="closeDetailsDialog" class="close-btn">
            閉じる
          </button>
        </div>
      </div>
    </div>

    <!-- メッセージ表示 -->
    <div v-if="message.text" :class="['message', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const orders = ref([])
const loading = ref(false)
const refunding = ref(false)
const statusFilter = ref('all')
const message = ref({ text: '', type: '' })

const refundDialog = ref({
  show: false,
  order: null,
  reason: ''
})

const detailsDialog = ref({
  show: false,
  order: null
})

// 注文データ取得
async function fetchOrders() {
  loading.value = true
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter.value !== 'all') {
      if (statusFilter.value === 'refunded') {
        query = query.eq('refunded', true)
      } else {
        query = query.eq('status', statusFilter.value)
      }
    }

    const { data, error } = await query

    if (error) throw error

    orders.value = data || []
    
    // デバッグ: 取得した注文データをログ出力
    console.log(`📦 注文データ取得成功: ${orders.value.length}件`)
    
    // 特定の注文番号の詳細を確認
    const targetOrder = orders.value.find(o => o.order_number === 'ORD1762178272595254')
    if (targetOrder) {
      console.log('🎯 対象注文が見つかりました:', {
        order_number: targetOrder.order_number,
        status: targetOrder.status,
        payment_method: targetOrder.payment_method,
        square_payment_id: targetOrder.square_payment_id,
        square_order_id: targetOrder.square_order_id,
        refunded: targetOrder.refunded,
        paid_at: targetOrder.paid_at
      })
    } else {
      console.log('❌ 注文番号 ORD1762178272595254 が見つかりません')
    }
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    showMessage('注文の取得に失敗しました: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 返金ダイアログを開く
function openRefundDialog(order) {
  refundDialog.value = {
    show: true,
    order: order,
    reason: ''
  }
}

// 返金ダイアログを閉じる
function closeRefundDialog() {
  refundDialog.value = {
    show: false,
    order: null,
    reason: ''
  }
}

// 返金実行
async function executeRefund() {
  if (!refundDialog.value.order || !refundDialog.value.reason.trim()) {
    showMessage('返金理由を入力してください', 'error')
    return
  }

  if (!confirm(`本当に返金しますか?\n\n注文番号: ${refundDialog.value.order.order_number}\n金額: ¥${formatPrice(refundDialog.value.order.price * refundDialog.value.order.quantity)}`)) {
    return
  }

  refunding.value = true
  try {
    const { data, error } = await supabase.functions.invoke('square-refund', {
      body: {
        orderId: refundDialog.value.order.id,
        reason: refundDialog.value.reason
      }
    })

    if (error) throw error

    showMessage('返金処理が完了しました', 'success')
    closeRefundDialog()
    await fetchOrders() // 注文リストを更新
  } catch (error) {
    console.error('Refund failed:', error)
    showMessage('返金処理に失敗しました: ' + error.message, 'error')
  } finally {
    refunding.value = false
  }
}

// 注文詳細を表示
function viewOrderDetails(order) {
  detailsDialog.value = {
    show: true,
    order: order
  }
}

// 詳細ダイアログを閉じる
function closeDetailsDialog() {
  detailsDialog.value = {
    show: false,
    order: null
  }
}

// 返金可能かチェック
function canRefund(order) {
  // デバッグ: 特定の注文番号の詳細をログ出力
  if (order.order_number === 'ORD1762178272595254') {
    console.log('🔍 返金ボタン表示チェック:', {
      order_number: order.order_number,
      status: order.status,
      refunded: order.refunded,
      square_payment_id: order.square_payment_id,
      payment_method: order.payment_method,
      canRefund: order.status === 'paid' && !order.refunded && order.square_payment_id
    })
  }
  
  return (
    order.status === 'paid' && 
    !order.refunded && 
    order.square_payment_id
  )
}

// ステータステキスト取得
function getStatusText(status, refunded) {
  if (refunded) return '返金済み'
  const statusMap = {
    pending: '決済待ち',
    paid: '決済完了',
    refunded: '返金済み',
    cancelled: 'キャンセル'
  }
  return statusMap[status] || status
}

// 日付フォーマット
function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 金額フォーマット
function formatPrice(price) {
  return new Intl.NumberFormat('ja-JP').format(price)
}

// メッセージ表示
function showMessage(text, type = 'info') {
  message.value = { text, type }
  setTimeout(() => {
    message.value = { text: '', type: '' }
  }, 5000)
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.admin-order-list {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-section h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.status-filter {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: #2c5f2d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.refresh-btn:hover {
  background: #1f4620;
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #666;
}

.no-orders {
  text-align: center;
  padding: 3rem;
  color: #999;
  font-size: 1.1rem;
}

.table-container {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.orders-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.orders-table td {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
}

.orders-table tbody tr:hover {
  background: #f8f9fa;
}

.refunded-row {
  background: #fff3cd !important;
  opacity: 0.8;
}

.order-number {
  font-family: monospace;
  font-weight: 600;
  color: #2c5f2d;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.customer-info small {
  color: #6c757d;
  font-size: 0.85rem;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
  font-weight: 600;
}

.payment-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #6c757d;
}

.no-payment {
  color: #dc3545;
  font-size: 0.85rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-paid {
  background: #d4edda;
  color: #155724;
}

.status-refunded {
  background: #f8d7da;
  color: #721c24;
}

.refund-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.refund-btn, .view-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  white-space: nowrap;
}

.refund-btn {
  background: #dc3545;
  color: white;
}

.refund-btn:hover:not(:disabled) {
  background: #c82333;
}

.refund-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.view-btn {
  background: #007bff;
  color: white;
}

.view-btn:hover {
  background: #0056b3;
}

.refunded-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #6c757d;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.details-modal {
  max-width: 700px;
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.refund-details {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.refund-details p {
  margin: 0.5rem 0;
  color: #495057;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
}

.refund-reason-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.refund-reason-input:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 3px rgba(44, 95, 45, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.cancel-btn, .close-btn {
  padding: 0.75rem 1.5rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.cancel-btn:hover, .close-btn:hover {
  background: #5a6268;
}

.confirm-refund-btn {
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.confirm-refund-btn:hover:not(:disabled) {
  background: #c82333;
}

.confirm-refund-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.order-details section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.order-details section:last-child {
  border-bottom: none;
}

.order-details h4 {
  margin: 0 0 1rem 0;
  color: #2c5f2d;
  font-size: 1.1rem;
}

.order-details p {
  margin: 0.5rem 0;
  color: #495057;
}

/* メッセージ */
.message {
  position: fixed;
  top: 100px;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .admin-order-list {
    padding: 1rem;
  }

  .header-section {
    flex-direction: column;
    align-items: stretch;
  }

  .header-section h2 {
    font-size: 1.5rem;
  }

  .filter-section {
    flex-direction: column;
  }

  .status-filter, .refresh-btn {
    width: 100%;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .orders-table {
    font-size: 0.85rem;
  }

  .orders-table th,
  .orders-table td {
    padding: 0.5rem;
  }

  .modal-content {
    padding: 1.5rem;
    margin: 0.5rem;
  }

  .message {
    top: 90px;
    right: 1rem;
    left: 1rem;
  }
}
</style>
