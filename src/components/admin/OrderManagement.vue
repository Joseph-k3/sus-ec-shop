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
      <div v-for="orderGroup in groupedOrders" :key="orderGroup.key" class="order-group">
        <!-- カート注文の場合は一括表示 -->
        <div v-if="orderGroup.isCartOrder" class="cart-order-header">
          <h3>🛒 カート注文: {{ orderGroup.cartGroupId || orderGroup.orders[0].order_number }}</h3>
          <span :class="['status-badge', orderGroup.orders[0].status]">{{ getStatusLabel(orderGroup.orders[0].status) }}</span>
          <div class="cart-summary">
            <span>{{ orderGroup.orders.length }}商品</span>
            <span class="total-amount">合計: ¥{{ orderGroup.totalAmount.toLocaleString() }}</span>
          </div>
        </div>

        <!-- カート注文の商品一覧 -->
        <div v-if="orderGroup.isCartOrder" class="cart-items">
          <div v-for="order in orderGroup.orders" :key="order.id" class="cart-item">
            <img :src="order.product_image" :alt="order.product_name" class="product-thumbnail-small">
            <div class="cart-item-details">
              <span class="product-name">{{ order.product_name }}</span>
              <span class="product-price">¥{{ order.price.toLocaleString() }} × {{ order.quantity }}</span>
            </div>
            <div class="item-total">¥{{ (order.price * order.quantity).toLocaleString() }}</div>
          </div>
        </div>

        <!-- カート注文の顧客情報（統一表示） -->
        <div v-if="orderGroup.isCartOrder" class="cart-customer-info">
          <div class="customer-info">
            <p><strong>購入者:</strong> {{ orderGroup.orders[0].customer_name }}</p>
            <p><strong>顧客ID:</strong> <code class="customer-id">{{ orderGroup.orders[0].customer_id }}</code></p>
            <p><strong>メール:</strong> {{ orderGroup.orders[0].email }}</p>
            <p><strong>電話:</strong> {{ orderGroup.orders[0].phone }}</p>
            <p><strong>住所:</strong> {{ orderGroup.orders[0].address }}</p>
          </div>
          <div class="payment-info">
            <p><strong>支払方法:</strong> 銀行振込</p>
            <p><strong>支払期限:</strong> {{ formatDate(orderGroup.orders[0].payment_due_date) }}</p>
          </div>
        </div>

        <!-- カート注文の統一一括操作ボタン -->
        <div v-if="orderGroup.isCartOrder" class="cart-unified-actions">
          <div class="action-section">
            <h4 class="action-title">📦 カート注文 一括操作</h4>
            <div class="action-buttons">
              <!-- 入金待ち状態 -->
              <template v-if="orderGroup.orders[0].status === 'pending_payment'">
                <button 
                  class="unified-btn confirm-payment" 
                  @click="confirmCartPayment(orderGroup.orders)"
                  title="カート内全商品の入金を確認します"
                >
                  💳 振込完了
                  <span class="btn-subtitle">{{ orderGroup.orders.length }}商品</span>
                </button>
                <button 
                  class="unified-btn cancel-order" 
                  @click="cancelCartOrder(orderGroup.orders)"
                  title="カート注文全体をキャンセルし、在庫を復元します"
                >
                  ❌ 注文をキャンセル
                  <span class="btn-subtitle">在庫復元</span>
                </button>
              </template>

              <!-- 入金済み状態 -->
              <template v-if="orderGroup.orders[0].status === 'paid'">
                <!-- 追跡番号入力セクション -->
                <div class="tracking-section">
                  <h5 class="tracking-title">📦 発送・追跡番号登録</h5>
                  <div class="tracking-input-group">
                    <input 
                      type="text" 
                      v-model="trackingNumbers[`cart_${orderGroup.cartGroupId || orderGroup.orders[0].order_number}`]" 
                      placeholder="追跡番号を入力 (例: 1234-5678-9012)"
                      class="tracking-input"
                      maxlength="50"
                    >
                    <select v-model="shippingCarriers[`cart_${orderGroup.cartGroupId || orderGroup.orders[0].order_number}`]" class="carrier-select">
                      <option value="">配送業者を選択</option>
                      <option value="yamato">ヤマト運輸</option>
                      <option value="sagawa">佐川急便</option>
                      <option value="post">日本郵便</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  class="unified-btn confirm-shipment" 
                  @click="confirmCartShipment(orderGroup.orders)"
                  title="カート内全商品の発送を完了し、追跡番号をメール送信します"
                  :disabled="!trackingNumbers[`cart_${orderGroup.cartGroupId || orderGroup.orders[0].order_number}`] || !shippingCarriers[`cart_${orderGroup.cartGroupId || orderGroup.orders[0].order_number}`]"
                >
                  🚚 発送完了＆追跡番号送信
                  <span class="btn-subtitle">{{ orderGroup.orders.length }}商品</span>
                </button>
              </template>

              <!-- 発送済み状態 -->
              <template v-if="orderGroup.orders[0].status === 'shipped'">
                <button 
                  class="unified-btn complete-order" 
                  @click="completeCartOrder(orderGroup.orders)"
                  title="カート注文の取引を完了します"
                >
                  ✅ 取引完了
                  <span class="btn-subtitle">完了処理</span>
                </button>
              </template>

              <!-- 完了・キャンセル済み状態 -->
              <template v-if="orderGroup.orders[0].status === 'completed'">
                <div class="status-info completed">
                  <span class="status-icon">✅</span>
                  <span class="status-text">取引完了済み</span>
                </div>
              </template>

              <template v-if="orderGroup.orders[0].status === 'cancelled'">
                <div class="status-info cancelled">
                  <span class="status-icon">❌</span>
                  <span class="status-text">キャンセル済み</span>
                </div>
              </template>
            </div>
          </div>
        </div>        <!-- 通常の単品注文表示 -->
        <div v-else class="order-card">
          <div class="order-header">
            <h3>注文番号: {{ orderGroup.orders[0].order_number }}</h3>
            <span :class="['status-badge', orderGroup.orders[0].status]">{{ getStatusLabel(orderGroup.orders[0].status) }}</span>
          </div>

          <div class="order-details">
            <div class="product-info">
              <img :src="orderGroup.orders[0].product_image" :alt="orderGroup.orders[0].product_name" class="product-thumbnail">
              <div>
                <h4>{{ orderGroup.orders[0].product_name }}</h4>
                <p class="price">¥{{ orderGroup.orders[0].price.toLocaleString() }}</p>
              </div>
            </div>

            <div class="customer-info">
              <p><strong>購入者:</strong> {{ orderGroup.orders[0].customer_name }}</p>
              <p><strong>顧客ID:</strong> <code class="customer-id">{{ orderGroup.orders[0].customer_id }}</code></p>
              <p><strong>メール:</strong> {{ orderGroup.orders[0].email }}</p>
              <p><strong>電話:</strong> {{ orderGroup.orders[0].phone }}</p>
              <p><strong>住所:</strong> {{ orderGroup.orders[0].address }}</p>
            </div>

            <div class="payment-info">
              <p><strong>支払方法:</strong> {{ orderGroup.orders[0].payment_method === 'bank' ? '銀行振込' : 'Square決済' }}</p>
              <p v-if="orderGroup.orders[0].payment_method === 'bank'">
                <strong>支払期限:</strong> {{ formatDate(orderGroup.orders[0].payment_due_date) }}
              </p>
            </div>
          </div>

          <div class="order-actions">
            <template v-if="orderGroup.orders[0].status === 'pending_payment'">
              <button 
                class="action-button confirm-payment" 
                @click="confirmPayment(orderGroup.orders[0])"
              >
                入金確認
              </button>
              <button 
                class="action-button cancel-order" 
                @click="cancelOrder(orderGroup.orders[0])"
              >
                キャンセル
              </button>
            </template>

            <template v-if="orderGroup.orders[0].status === 'paid'">
              <!-- 追跡番号入力セクション（単品注文用） -->
              <div class="tracking-section-single">
                <h5 class="tracking-title">📦 発送・追跡番号登録</h5>
                <div class="tracking-input-group">
                  <input 
                    type="text" 
                    v-model="trackingNumbers[orderGroup.orders[0].id]" 
                    placeholder="追跡番号を入力"
                    class="tracking-input"
                    maxlength="50"
                  >
                  <select v-model="shippingCarriers[orderGroup.orders[0].id]" class="carrier-select">
                    <option value="">配送業者</option>
                    <option value="yamato">ヤマト運輸</option>
                    <option value="sagawa">佐川急便</option>
                    <option value="post">日本郵便</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
              
              <button 
                class="action-button confirm-shipment" 
                @click="confirmShipment(orderGroup.orders[0])"
                :disabled="!trackingNumbers[orderGroup.orders[0].id] || !shippingCarriers[orderGroup.orders[0].id]"
              >
                発送完了＆追跡番号送信
              </button>
            </template>

            <template v-if="orderGroup.orders[0].status === 'shipped'">
              <button 
                class="action-button complete-order" 
                @click="completeOrder(orderGroup.orders[0])"
              >
                取引完了
              </button>
            </template>

            <template v-if="orderGroup.orders[0].status === 'cancelled'">
              <button 
                class="action-button cancelled-order" 
                disabled
              >
                キャンセル済み
              </button>
            </template>

            <template v-if="orderGroup.orders[0].status === 'completed' && orderGroup.orders[0].stock_after_sale === 0">
              <button 
                class="action-button delete-product warning" 
                @click="deleteProduct(orderGroup.orders[0])"
              >
                商品を完全削除
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../lib/supabase'
import getPublicImageUrl from '../../lib/imageUtils.js'
import { sendTrackingNumberEmail, sendCartTrackingNumberEmail } from '../../lib/postmark' // メール送信機能を有効化

const route = useRoute()
const orders = ref([])
const statusFilter = ref('all')
const trackingNumbers = ref({}) // 追跡番号を格納
const shippingCarriers = ref({}) // 配送業者を格納

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

// カート注文をグループ化した注文リスト
const groupedOrders = computed(() => {
  const groups = []
  const processedCartGroups = new Set()
  
  for (const order of filteredOrders.value) {
    // カート注文（order_numberがCARTで始まる）の場合
    if (order.order_number && order.order_number.startsWith('CART')) {
      // addressフィールドからカートグループIDを抽出
      const cartGroupMatch = order.address?.match(/\[CartGroup:(CART\d+[A-Z0-9]*)\]/)
      const cartGroupId = cartGroupMatch ? cartGroupMatch[1] : order.order_number.split('_')[0]
      
      // 既に処理済みのカートグループはスキップ
      if (processedCartGroups.has(cartGroupId)) {
        continue
      }
      
      // 同じカートグループの全ての商品を取得
      const cartOrders = filteredOrders.value.filter(o => {
        if (!o.order_number || !o.order_number.startsWith('CART')) return false
        const groupMatch = o.address?.match(/\[CartGroup:(CART\d+[A-Z0-9]*)\]/)
        const groupId = groupMatch ? groupMatch[1] : o.order_number.split('_')[0]
        return groupId === cartGroupId
      })
      
      const totalAmount = cartOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0)
      
      groups.push({
        key: `cart_${cartGroupId}`,
        isCartOrder: true,
        orders: cartOrders,
        totalAmount: totalAmount,
        cartGroupId: cartGroupId
      })
      
      processedCartGroups.add(cartGroupId)
    } else {
      // 通常の単品注文
      groups.push({
        key: `single_${order.id}`,
        isCartOrder: false,
        orders: [order]
      })
    }
  }
  
  return groups
})

// 注文データの取得
const fetchOrders = async () => {
  try {
    // まずordersテーブルから全注文を取得
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('❌ 注文データ取得エラー:', ordersError)
      throw ordersError
    }
    
    if (ordersData.length === 0) {
      orders.value = []
      return
    }
    
    // 各注文に対して商品情報を個別に取得
    const ordersWithProductInfo = await Promise.all(
      ordersData.map(async (order) => {
        // デフォルト値
        let productName = '商品情報なし'
        let productImage = '/placeholder.jpg'
        
        if (order.product_id) {
          try {
            // succulentsテーブルから商品情報を取得
            const { data: product, error: productError } = await supabase
              .from('succulents')
              .select('name, image')
              .eq('id', order.product_id)
              .maybeSingle()
            
            if (!productError && product) {
              productName = product.name
              
              // まずproduct_imagesテーブルから画像を取得
              const { data: productImages, error: imageError } = await supabase
                .from('product_images')
                .select('image_url, is_primary, display_order')
                .eq('product_id', order.product_id)
                .order('display_order', { ascending: true })
              
              if (!imageError && productImages && productImages.length > 0) {
                // プライマリ画像があればそれを使用、なければ最初の画像
                const primaryImage = productImages.find(img => img.is_primary) || productImages[0]
                productImage = getPublicImageUrl(primaryImage.image_url)
              } else {
                // product_imagesになければsucculentsテーブルの画像を使用
                if (product.image) {
                  productImage = getPublicImageUrl(product.image)
                }
              }
            } else {
              console.warn(`⚠️ 商品情報取得失敗 (product_id: ${order.product_id}):`, productError)
            }
          } catch (err) {
            console.error(`❌ 商品データ取得エラー (product_id: ${order.product_id}):`, err)
          }
        }
        
        return {
          ...order,
          product_name: productName,
          product_image: productImage
        }
      })
    )
    
    orders.value = ordersWithProductInfo
    
  } catch (error) {
    console.error('❌ 注文データの取得に失敗しました:', error)
    alert('注文データの取得に失敗しました。\n\nエラー: ' + (error.message || '不明なエラー'))
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
  const trackingNumber = trackingNumbers.value[order.id]
  const carrier = shippingCarriers.value[order.id]
  
  if (!trackingNumber || !carrier) {
    alert('追跡番号と配送業者を入力してください。')
    return
  }
  
  if (!confirm(`注文番号: ${order.order_number} の商品を発送完了にし、追跡番号をお客様にメール送信しますか？`)) return

  try {
    // ステータスを発送済みに更新し、追跡番号を保存
    let updateData = { 
      status: 'shipped',
      updated_at: new Date().toISOString()
    }
    
    // 追跡番号カラムが存在するかチェックしてから追加
    try {
      updateData.tracking_number = trackingNumber
      updateData.shipping_carrier = carrier
    } catch (e) {
      console.warn('追跡番号カラムが存在しない可能性があります:', e)
    }
    
    const { error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    if (orderError) throw orderError

    // 追跡番号メールを送信（メール機能無効化）
    /*
    try {
      await sendTrackingNumberEmail(order, trackingNumber, carrier)
      alert('発送完了を記録し、追跡番号をお客様にメール送信しました。')
    } catch (emailError) {
      console.error('メール送信エラー:', emailError)
      alert('発送完了は記録されましたが、メール送信に失敗しました。手動でお客様にご連絡ください。')
    }
    */
    alert('発送完了を記録しました。')

    // 入力フィールドをクリア
    delete trackingNumbers.value[order.id]
    delete shippingCarriers.value[order.id]
    
    await fetchOrders()
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

// カート注文の振込完了処理
const confirmCartPayment = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  const totalAmount = cartOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0)
  
  const confirmMessage = `🛒 カート注文の振込完了確認\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `💰 合計金額: ¥${totalAmount.toLocaleString()}\n\n` +
    `入金を確認しましたか？`
  
  if (!confirm(confirmMessage)) return

  try {
    // 全ての注文の状態を一括更新
    const orderIds = cartOrders.map(order => order.id)
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)

    if (orderError) throw orderError

    await fetchOrders()
    alert(`✅ カート注文の振込完了\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n\n発送の準備を開始してください。`)
  } catch (error) {
    console.error('カート注文振込完了処理に失敗しました:', error)
    alert('❌ エラーが発生しました。もう一度お試しください。')
  }
}

// カート注文のキャンセル処理
const cancelCartOrder = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  const totalAmount = cartOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0)
  
  const confirmMessage = `🛒 カート注文をキャンセル\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `💰 合計金額: ¥${totalAmount.toLocaleString()}\n\n` +
    `⚠️ この操作により在庫が元に戻されます。\n` +
    `本当にキャンセルしますか？`
  
  if (!confirm(confirmMessage)) return

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
            quantity: product.quantity + order.quantity 
          })
          .eq('id', order.product_id)
      }
    }

    await fetchOrders()
    alert(`✅ カート注文をキャンセルしました\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n\n在庫を復元しました。`)
  } catch (error) {
    console.error('カート注文キャンセル処理に失敗しました:', error)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}

// カート注文の発送完了処理
const confirmCartShipment = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  // orderGroup.keyを使用してtrackingNumberとcarrierを取得
  const groupKey = `cart_${cartGroupId}`
  const trackingNumber = trackingNumbers.value[groupKey]
  const carrier = shippingCarriers.value[groupKey]
  
  if (!trackingNumber || !carrier) {
    alert('追跡番号と配送業者を入力してください。')
    return
  }
  
  const confirmMessage = `🛒 カート注文の発送完了\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `📫 追跡番号: ${trackingNumber}\n\n` +
    `すべての商品を発送完了にし、追跡番号をお客様にメール送信しますか？`
  
  if (!confirm(confirmMessage)) return

  try {
    const orderIds = cartOrders.map(order => order.id)
    
    let updateData = { 
      status: 'shipped',
      updated_at: new Date().toISOString()
    }
    
    // 追跡番号カラムが存在するかチェック
    try {
      updateData.tracking_number = trackingNumber
      updateData.shipping_carrier = carrier
    } catch (e) {
      console.warn('追跡番号カラムが存在しない可能性があります:', e)
    }
    
    const { error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .in('id', orderIds)

    if (orderError) throw orderError

    // 追跡番号メールを送信（カート注文用）（メール機能無効化）
    /*
    try {
      await sendCartTrackingNumberEmail(cartOrders, trackingNumber, carrier)
      alert(`✅ カート注文の発送完了\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n📫 追跡番号メールを送信しました。`)
    } catch (emailError) {
      console.error('メール送信エラー:', emailError)
      alert(`✅ カート注文の発送完了\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n\n⚠️ 発送完了は記録されましたが、メール送信に失敗しました。手動でお客様にご連絡ください。`)
    }
    */
    alert(`✅ カート注文の発送完了\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n📋 発送完了を記録しました。`)

    // 入力フィールドをクリア
    const groupKey = `cart_${cartGroupId}`
    delete trackingNumbers.value[groupKey]
    delete shippingCarriers.value[groupKey]

    await fetchOrders()
  } catch (error) {
    console.error('カート注文発送完了処理に失敗しました:', error)
    alert('❌ エラーが発生しました。もう一度お試しください。')
  }
}

// カート注文の取引完了処理
const completeCartOrder = async (cartOrders) => {
  const cartGroupId = extractCartGroupId(cartOrders[0])
  const totalAmount = cartOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0)
  
  const confirmMessage = `🛒 カート注文の取引完了\n\n` +
    `📦 注文グループ: ${cartGroupId}\n` +
    `🏷️  商品数: ${cartOrders.length}点\n` +
    `💰 合計金額: ¥${totalAmount.toLocaleString()}\n\n` +
    `取引を完了としますか？`
  
  if (!confirm(confirmMessage)) return

  try {
    const orderIds = cartOrders.map(order => order.id)
    const { error: orderError } = await supabase
      .from('orders')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)

    if (orderError) throw orderError

    await fetchOrders()
    alert(`✅ カート注文の取引完了\n\n📦 ${cartGroupId}\n🏷️ ${cartOrders.length}商品\n💰 ¥${totalAmount.toLocaleString()}\n\n取引が完了しました。`)
  } catch (error) {
    console.error('カート注文取引完了処理に失敗しました:', error)
    alert('❌ エラーが発生しました。もう一度お試しください。')
  }
}

// カートグループIDを抽出するヘルパー関数
const extractCartGroupId = (order) => {
  const groupMatch = order.address?.match(/\[CartGroup:(CART\d+[A-Z0-9]*)\]/)
  return groupMatch ? groupMatch[1] : order.order_number.split('_')[0]
}

// 初期データ取得
onMounted(() => {
  fetchOrders()
})

// コンポーネントが再アクティブ化された時（keep-alive使用時）
onActivated(() => {
  fetchOrders()
})

// ルート変更を監視
watch(() => route.path, (newPath) => {
  if (newPath === '/admin/orders') {
    fetchOrders()
  }
})

</script>

<style scoped>
.order-management {
  max-width: 1400px;
  margin: 2rem auto;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  min-height: 80vh;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.order-management * {
  max-width: 100%;
  box-sizing: border-box;
  touch-action: manipulation;
}

.order-management h2 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
}

.filter-section {
  margin-bottom: 2rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.filter-section select {
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #ced4da;
  background: white;
  color: #495057;
  font-size: 1rem;
  min-width: 150px;
  width: 100%;
  max-width: 200px;
  box-sizing: border-box;
}

.filter-section select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.orders-list {
  display: grid;
  gap: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.order-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
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

/* 顧客情報のスタイル改善 */
.customer-info {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-wrap: break-word;
  overflow: hidden;
}

.customer-info p {
  margin: 0.5rem 0;
  color: #495057;
  font-weight: 500;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

.customer-info strong {
  color: #2c3e50;
  word-break: break-word;
}

.customer-id {
  background: #e3f2fd;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #1565c0;
  border: 1px solid #bbdefb;
  font-weight: 600;
  word-break: break-all;
  overflow-wrap: break-word;
  display: inline-block;
  max-width: 100%;
}

.payment-info {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-wrap: break-word;
  overflow: hidden;
}

.payment-info p {
  margin: 0.5rem 0;
  color: #495057;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
  font-weight: 500;
}

.payment-info strong {
  color: #2c3e50;
}

.order-group {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  border: 1px solid #e9ecef;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.cart-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid #2c5f2d;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cart-order-header h3 {
  color: #2c5f2d;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.cart-summary {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
  flex-wrap: wrap;
}

.total-amount {
  font-weight: bold;
  color: #2c5f2d;
  font-size: 1.1rem;
}

.cart-items {
  margin: 1rem 0;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e9ecef;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.cart-item:last-child {
  border-bottom: none;
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
  min-width: 0;
  overflow: hidden;
}

.product-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.product-price {
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
}

.item-total {
  font-weight: bold;
  color: #2c5f2d;
  white-space: nowrap;
  flex-shrink: 0;
}

.cart-customer-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.cart-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

/* 統一された一括操作ボタンのスタイル */
.cart-unified-actions {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-title {
  margin: 0;
  color: #2c5f2d;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.unified-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  box-sizing: border-box;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.unified-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.unified-btn.confirm-payment {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
}

.unified-btn.confirm-payment:hover {
  background: linear-gradient(135deg, #218838, #1ea085);
}

.unified-btn.cancel-order {
  background: linear-gradient(135deg, #dc3545, #e74c3c);
  color: white;
}

.unified-btn.cancel-order:hover {
  background: linear-gradient(135deg, #c82333, #dc2f3a);
}

.unified-btn.confirm-shipment {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.unified-btn.confirm-shipment:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
}

.unified-btn.complete-order {
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
}

.unified-btn.complete-order:hover {
  background: linear-gradient(135deg, #5a6268, #495057);
}

.btn-subtitle {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.9;
  margin-top: 0.25rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  min-width: 120px;
  box-sizing: border-box;
  justify-content: center;
}

.status-info.completed {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-info.cancelled {
  background: linear-gradient(135deg, #f8d7da, #f1b0b7);
  color: #721c24;
  border: 1px solid #f1b0b7;
}

.status-icon {
  font-size: 1.2rem;
}

.status-text {
  font-size: 0.95rem;
}

/* 追跡番号入力関連のスタイル */
.tracking-section,
.tracking-section-single {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.tracking-title {
  color: #495057;
  font-size: 0.9rem;
  margin: 0 0 0.75rem 0;
  font-weight: 600;
}

.tracking-input-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tracking-input {
  flex: 2;
  min-width: min(200px, 100%);
  padding: 0.5rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: monospace;
  box-sizing: border-box;
}

.tracking-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.carrier-select {
  flex: 1;
  min-width: min(120px, 100%);
  padding: 0.5rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  box-sizing: border-box;
}

.carrier-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* 無効状態のボタンスタイル */
.unified-btn:disabled,
.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.unified-btn:disabled:hover,
.action-button:disabled:hover {
  transform: none;
  background: #6c757d;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .order-management {
    margin: 0 !important;
    padding: 0.5rem !important;
    width: 100vw !important;
    max-width: 100vw !important;
    border-radius: 0 !important;
    overflow-x: hidden !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .order-management h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .order-group {
    padding: 1rem;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .cart-order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    margin: 0;
    padding: 1rem;
    width: 100%;
    max-width: 100%;
  }

  .cart-order-header h3 {
    font-size: 1.1rem;
    width: 100%;
  }

  .cart-summary {
    width: 100%;
    justify-content: space-between;
  }

  .cart-items {
    padding: 0.75rem;
    margin: 0.75rem 0;
  }

  .cart-item {
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .product-thumbnail-small {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

  .cart-item-details {
    min-width: 0;
    flex: 1;
  }

  .product-name {
    font-size: 0.9rem;
    line-height: 1.3;
  }

  .product-price {
    font-size: 0.85rem;
  }

  .item-total {
    font-size: 0.9rem;
  }

  .cart-customer-info {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }

  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .order-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-button {
    width: 100%;
    min-height: 48px;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .unified-btn,
  .status-info {
    width: 100%;
    min-width: auto;
    min-height: 48px;
  }

  .cart-unified-actions {
    padding: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  .action-title {
    font-size: 1rem;
    text-align: center;
  }

  .tracking-input-group {
    flex-direction: column;
    width: 100%;
  }
  
  .tracking-input,
  .carrier-select {
    width: 100%;
    min-width: auto;
    box-sizing: border-box;
  }

  .filter-section {
    width: 100%;
    box-sizing: border-box;
  }

  .filter-section select {
    width: 100%;
    min-width: auto;
  }

  .orders-list {
    width: 100%;
  }

  .order-card,
  .order-group {
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
