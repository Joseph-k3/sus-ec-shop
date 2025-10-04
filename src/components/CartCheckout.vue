<template>
  <div class="cart-checkout-container">
    <div class="checkout-header">
      <h2>📋 カート注文手続き</h2>
      <router-link to="/cart" class="back-to-cart">← カートに戻る</router-link>
    </div>

    <div class="checkout-content">
      <!-- 注文サマリー -->
      <div class="order-summary">
        <h3>📦 ご注文内容</h3>
        <div class="summary-items">
          <div v-for="item in cart.items" :key="item.id" class="summary-item">
            <img :src="item.image" :alt="item.name" class="summary-item-image" />
            <div class="summary-item-details">
              <span class="summary-item-name">{{ item.name }}</span>
              <span class="summary-item-price">¥{{ item.price.toLocaleString() }} × {{ item.quantity }}</span>
            </div>
            <div class="summary-item-subtotal">
              ¥{{ (item.price * item.quantity).toLocaleString() }}
            </div>
          </div>
        </div>
        <div class="order-total-breakdown">
          <div class="subtotal">商品小計: ¥{{ cart.totalAmount.toLocaleString() }}</div>
          <div class="shipping-fee">送料 ({{ shippingInfo.region }}): ¥{{ shippingInfo.shippingFee.toLocaleString() }}</div>
          <div class="total-amount"><strong>合計: ¥{{ shippingInfo.totalAmount.toLocaleString() }}</strong></div>
          <div class="shipping-note">※ 北海道・沖縄は送料1,800円となります</div>
        </div>
      </div>

      <!-- お客様情報入力フォーム -->
      <form @submit.prevent="submitOrder" class="customer-form">
        <h3>👤 お客様情報</h3>
        
        <div class="form-group">
          <label for="customerName">お名前 *</label>
          <input 
            id="customerName"
            v-model="form.customerName" 
            type="text" 
            required 
            placeholder="田中太郎"
          />
        </div>

        <div class="form-group">
          <label for="email">メールアドレス *</label>
          <input 
            id="email"
            v-model="form.email" 
            type="email" 
            required 
            placeholder="example@email.com"
          />
        </div>

        <div class="form-group">
          <label for="phone">電話番号 *</label>
          <input 
            id="phone"
            v-model="form.phone" 
            type="tel" 
            required 
            placeholder="090-1234-5678"
          />
        </div>

        <div class="form-group">
          <label for="postal">郵便番号 *</label>
          <div class="input-wrapper">
            <input 
              id="postal"
              v-model="form.postal" 
              type="text" 
              required 
              placeholder="123-4567"
              @input="onPostalInput"
              pattern="[0-9]{3}-[0-9]{4}"
              maxlength="8"
              inputmode="numeric"
              autocomplete="postal-code"
              :class="{ 
                'valid': isValidZipCode(form.postal) && form.postal.length === 8,
                'loading': isAddressLoading 
              }"
            />
            <div v-if="isAddressLoading" class="input-spinner">
              <div class="spinner"></div>
            </div>
            <div v-else-if="isValidZipCode(form.postal) && form.postal.length === 8" class="input-checkmark">
              ✓
            </div>
          </div>
          <div v-if="isAddressLoading" class="address-loading">
            <small>住所を検索中...</small>
          </div>
          <small class="form-hint">
            数字を入力するとハイフンが自動で挿入されます（例：1234567 → 123-4567）。<br>
            完全な郵便番号を入力すると自動で住所候補を表示します。<br>
            <strong>テスト用:</strong> 100-0001（千代田区）、164-0001（中野区）、810-0001（福岡市）
          </small>
          
          <!-- 住所自動補完の提案 -->
          <div v-if="showAddressSuggestion" class="address-suggestion">
            <div class="suggestion-header">
              <span class="suggestion-icon">📍</span>
              <span class="suggestion-text">
                住所候補が見つかりました
                <span v-if="suggestedAddresses.length > 1" class="candidate-count">
                  ({{ suggestedAddresses.length }}件)
                </span>
              </span>
              <button type="button" class="close-suggestion" @click="closeSuggestion">&times;</button>
            </div>
            
            <!-- 複数候補がある場合の選択 -->
            <div v-if="suggestedAddresses.length > 1" class="address-options">
              <div 
                v-for="(address, index) in suggestedAddresses" 
                :key="index"
                class="address-option"
                :class="{ active: selectedSuggestionIndex === index }"
                @click="selectedSuggestionIndex = index"
              >
                {{ address.fullAddress }}
              </div>
            </div>
            
            <!-- 単一候補の場合 -->
            <div v-else class="single-address">
              {{ suggestedAddresses[0]?.fullAddress }}
            </div>
            
            <div class="suggestion-actions">
              <button 
                type="button" 
                class="btn-apply-address"
                @click="applySuggestedAddress"
              >
                この住所を使用
              </button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="address">住所 *</label>
          <input 
            id="address"
            v-model="form.address" 
            type="text" 
            required 
            placeholder="東京都渋谷区..."
          />
        </div>

        <div class="form-group">
          <label for="notes">備考</label>
          <textarea 
            id="notes"
            v-model="form.notes" 
            placeholder="配送に関するご要望など"
            rows="3"
          ></textarea>
        </div>

        <!-- 決済方法（銀行振込固定） -->
        <div class="payment-section">
          <h3>💳 お支払い方法</h3>
          <div class="payment-info-fixed">
            <div class="payment-option-fixed">
              <span class="payment-icon">🏦</span>
              <div class="payment-details">
                <span class="payment-title">銀行振込</span>
                <span class="payment-desc">注文確定後、振込先をメールでお知らせします</span>
              </div>
            </div>
            <div class="payment-note">
              <p>※ カートからのご注文は銀行振込のみとなります</p>
              <p>※ お振込確認後に商品を発送いたします</p>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="submit-btn"
            :disabled="isSubmitting || cart.items.length === 0"
          >
            <span v-if="isSubmitting">注文処理中...</span>
            <span v-else>注文を確定する</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ローディング表示 -->
    <div v-if="isSubmitting" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>注文を処理しています...</p>
    </div>

    <!-- メッセージ表示 -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { supabase } from '../lib/supabase'
import { getOrCreateCustomerId } from '../lib/customerUtils'
import { sendCartOrderEmail } from '../lib/postmark' // メール送信機能を有効化
import { useAddressLookup } from '../composables/useAddressLookup'
import { calculateTotalWithShipping } from '../lib/shipping.js' // 送料計算機能

const router = useRouter()
const cart = useCartStore()

const isSubmitting = ref(false)
const message = ref('')
const messageType = ref('success')

// 住所自動補完機能
const { 
  fetchAddressByZipCode, 
  formatZipCode, 
  isValidZipCode, 
  clearDebounce,
  isLoading: isAddressLoading 
} = useAddressLookup()

const showAddressSuggestion = ref(false)
const suggestedAddresses = ref([])
const selectedSuggestionIndex = ref(0)

const form = reactive({
  customerName: '',
  email: '',
  phone: '',
  postal: '',
  address: '',
  notes: '',
  paymentMethod: 'bank' // カートからの注文は銀行振込固定
})

// 送料計算
const shippingInfo = ref({
  itemTotal: 0,
  shippingFee: 1000,
  totalAmount: 0,
  region: '本州・四国・九州'
})

// 送料込みの合計金額を計算
const updateShippingInfo = () => {
  const itemTotal = cart.totalAmount
  if (form.postal && form.postal.length >= 7) {
    const shipping = calculateTotalWithShipping(itemTotal, form.postal)
    shippingInfo.value = shipping
  } else {
    // 郵便番号が未入力の場合はデフォルト送料
    shippingInfo.value = {
      itemTotal,
      shippingFee: 1000,
      totalAmount: itemTotal + 1000,
      region: '本州・四国・九州'
    }
  }
}

// カートの内容が変更されたときに送料を再計算
cart.$subscribe(() => {
  updateShippingInfo()
})

// 郵便番号が変更されたときに送料を再計算
const watchZipCode = () => {
  if (form.postal && form.postal.length >= 7) {
    updateShippingInfo()
  }
}

onMounted(() => {
  // カートが空の場合はカート画面にリダイレクト
  if (cart.items.length === 0) {
    router.push('/cart')
  }
  
  // 初期送料計算
  updateShippingInfo()
})

const onPostalInput = async (event) => {
  const rawValue = event.target.value
  const formattedValue = formatZipCode(rawValue)
  
  // フォーマットされた値をセット
  form.postal = formattedValue
  
  // カーソル位置の調整（ハイフンが自動挿入された場合）
  const input = event.target
  const cursorPos = input.selectionStart
  const oldLength = rawValue.length
  const newLength = formattedValue.length
  
  // ハイフンが追加された場合、カーソル位置を調整
  if (newLength > oldLength && cursorPos === 4) {
    setTimeout(() => {
      input.setSelectionRange(cursorPos + 1, cursorPos + 1)
    }, 0)
  }
  
  // 完全な郵便番号（7桁）が入力されたら自動的に住所を検索
  if (isValidZipCode(formattedValue) && formattedValue.length === 8) {
    await lookupAddress(formattedValue)
    // 送料を再計算
    updateShippingInfo()
  } else {
    // 郵便番号が完全でない場合は提案をクリア
    showAddressSuggestion.value = false
    suggestedAddresses.value = []
  }
  
  // 部分的でも郵便番号が変更されたら送料を更新
  if (formattedValue.length >= 7) {
    updateShippingInfo()
  }
}

// 住所検索機能
const lookupAddress = async (zipCode) => {
  try {
    const addressData = await fetchAddressByZipCode(zipCode)
    if (addressData && addressData.results && addressData.results.length > 0) {
      suggestedAddresses.value = addressData.results
      selectedSuggestionIndex.value = 0
      showAddressSuggestion.value = true
    } else {
      showAddressSuggestion.value = false
      suggestedAddresses.value = []
    }
  } catch (error) {
    console.error('住所検索エラー:', error)
    showAddressSuggestion.value = false
    suggestedAddresses.value = []
  }
}

// 提案された住所を適用
const applySuggestedAddress = () => {
  const selectedAddress = suggestedAddresses.value[selectedSuggestionIndex.value]
  if (selectedAddress) {
    // 住所を設定
    form.address = selectedAddress.fullAddress
    showAddressSuggestion.value = false
  }
}

// 住所提案を閉じる
const closeSuggestion = () => {
  showAddressSuggestion.value = false
  suggestedAddresses.value = []
  clearDebounce()
}

const submitOrder = async () => {
  if (cart.items.length === 0) {
    showMessage('カートに商品がありません', 'error')
    return
  }

  isSubmitting.value = true

  try {
    const customerId = getOrCreateCustomerId()
    
    // 1. 全商品の在庫チェックと確保（Optimistic locking）
    for (const item of cart.items) {
      // 現在の在庫を取得
      const { data: currentStock } = await supabase
        .from('succulents')
        .select('quantity, name')
        .eq('id', item.id)
        .single()

      if (!currentStock || currentStock.quantity < item.quantity) {
        throw new Error(`商品「${item.name}」の在庫が不足しています`)
      }

      // 現在の在庫数を条件にして在庫を減らす（競合状態を防ぐ）
      const { data: stockUpdateResult, error: updateError } = await supabase
        .from('succulents')
        .update({ quantity: currentStock.quantity - item.quantity })
        .eq('id', item.id)
        .eq('quantity', currentStock.quantity)  // optimistic locking
        .select('quantity, name')
        .single()

      if (updateError) {
        throw new Error(`商品「${item.name}」の在庫更新に失敗しました`)
      }

      // 更新された行がない場合（別のユーザーが先に購入した）
      if (!stockUpdateResult) {
        // 在庫数を確認して詳細なエラーメッセージを表示
        const { data: currentStock } = await supabase
          .from('succulents')
          .select('quantity')
          .eq('id', item.id)
          .single()
        
        throw new Error(`申し訳ありません。商品「${item.name}」の在庫が不足しています（在庫: ${currentStock?.quantity || 0}個、必要: ${item.quantity}個）`)
      }
    }
    
    // カート注文用の統一注文番号を生成
    const cartOrderNumber = `CART${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    const now = new Date().toISOString()
    const paymentDueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    
    // 郵便番号をフォーマット
    let formattedZipCode = form.postal.trim()
    if (/^\d{7}$/.test(formattedZipCode)) {
      formattedZipCode = formattedZipCode.slice(0, 3) + '-' + formattedZipCode.slice(3)
    }
    
    // 各商品ごとに注文を作成（個別の注文番号を生成し、共通のグループIDで管理）
    const orderPromises = cart.items.map(async (item, index) => {
      // 各商品に個別の注文番号を生成（カート注文の場合は末尾に連番を追加）
      const individualOrderNumber = `${cartOrderNumber}_${index + 1}`
      
      const orderData = {
        order_number: individualOrderNumber, // 個別の注文番号
        customer_id: customerId,
        product_id: item.id,
        product_name: item.name,
        product_image: item.image,
        price: item.price,
        quantity: item.quantity,
        customer_name: form.customerName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        payment_method: form.paymentMethod,
        status: 'pending_payment',
        payment_due_date: paymentDueDate,
        created_at: now,
        updated_at: now,
        customer_id: customerId,
        // カート注文であることを識別するフラグ（一時的にコメントアウト）
        // is_cart_order: true
      }

      // 住所にカートグループIDと送料情報を含める（管理者画面でのグループ化のため）
      let addressWithCartGroup = form.address
      if (form.notes) {
        addressWithCartGroup = `${form.address}\n備考: ${form.notes}\n[送料:${shippingInfo.value.shippingFee}円(${shippingInfo.value.region})]\n[CartGroup:${cartOrderNumber}]`
      } else {
        addressWithCartGroup = `${form.address}\n[送料:${shippingInfo.value.shippingFee}円(${shippingInfo.value.region})]\n[CartGroup:${cartOrderNumber}]`
      }

      // zip_codeカラムの存在を確認
      try {
        const { error: schemaError } = await supabase
          .from('orders')
          .select('zip_code')
          .limit(1)

        if (!schemaError) {
          orderData.zip_code = formattedZipCode
          orderData.address = addressWithCartGroup
        } else {
          // zip_codeカラムが存在しない場合は住所に含める
          orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
        }
      } catch (e) {
        // エラーの場合は統合形式を使用
        orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
      }

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()

      if (error) throw error
      return data[0]
    })

    const orders = await Promise.all(orderPromises)
    
    // メール送信機能を有効化
    try {
      await sendCartOrderEmail({
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        postal: form.postal,
        address: form.address,
        items: cart.items,
        itemTotal: cart.totalAmount, // 商品代金のみ
        shippingFee: shippingInfo.value.shippingFee, // 送料
        shippingRegion: shippingInfo.value.region, // 配送地域
        totalAmount: shippingInfo.value.totalAmount, // 送料込み合計
        paymentMethod: form.paymentMethod,
        notes: form.notes
      })
    } catch (emailError) {
      // メール送信に失敗してもエラーにしない（注文は成功扱い）
    }

    // カートを空にする（在庫は既に減らされているので、戻さない）
    cart.items.splice(0)
    cart.saveCartToStorage()

    showMessage('ご注文ありがとうございました！注文が正常に完了いたしました。', 'success')
    
    // 3秒後に注文履歴画面に遷移
    setTimeout(() => {
      router.push('/my-orders')
    }, 3000)

  } catch (error) {
    console.error('注文処理エラー:', error)
    console.error('エラーの詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // エラーが発生した場合、在庫を元に戻す（Optimistic locking）
    for (const item of cart.items) {
      try {
        // 現在の在庫を取得
        const { data: currentStock } = await supabase
          .from('succulents')
          .select('quantity')
          .eq('id', item.id)
          .single()
        
        if (currentStock) {
          // optimistic locking: 現在の在庫数を条件に在庫を戻す
          await supabase
            .from('succulents')
            .update({ quantity: currentStock.quantity + item.quantity })
            .eq('id', item.id)
            .eq('quantity', currentStock.quantity)
        }
      } catch (rollbackError) {
        console.error('在庫復元エラー:', rollbackError)
      }
    }
    
    // 在庫不足エラーの場合の特別処理
    if (error.message && error.message.includes('在庫が不足しています')) {
      showMessage('🚫 申し訳ありません。カート内の一部商品が在庫切れになりました。\n\n他のお客様が先にご購入されたため、現在在庫がございません。\nカートを確認して商品を調整してください。', 'error')
    } else {
      showMessage(`注文処理中にエラーが発生しました: ${error.message}`, 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const showMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}
</script>

<style scoped>
.cart-checkout-container {
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

.checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.checkout-header h2 {
  color: #2c5f2d;
  font-size: 2rem;
  margin: 0;
}

.back-to-cart {
  color: #2c5f2d;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #2c5f2d;
  border-radius: 6px;
  transition: all 0.3s;
}

.back-to-cart:hover {
  background: #2c5f2d;
  color: white;
}

.checkout-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.order-summary {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
  height: fit-content;
}

.order-summary h3 {
  color: #2c5f2d;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.summary-item-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
}

.summary-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.summary-item-name {
  font-weight: bold;
  color: #2c5f2d;
}

.summary-item-price {
  color: #666;
  font-size: 0.9rem;
}

.summary-item-subtotal {
  font-weight: bold;
  color: #2c5f2d;
}

.order-total {
  text-align: right;
  font-size: 1.2rem;
  color: #2c5f2d;
  padding-top: 1rem;
  border-top: 2px solid #2c5f2d;
}

.customer-form h3 {
  color: #2c5f2d;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
  background: white;
  color: #333;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 2px rgba(44, 95, 45, 0.1);
  color: #333;
}

/* プレースホルダーの文字色を改善 */
.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #999;
  opacity: 1;
}

.form-group input::-webkit-input-placeholder,
.form-group textarea::-webkit-input-placeholder {
  color: #999;
}

.form-group input::-moz-placeholder,
.form-group textarea::-moz-placeholder {
  color: #999;
  opacity: 1;
}

.form-group input:-ms-input-placeholder,
.form-group textarea:-ms-input-placeholder {
  color: #999;
}

/* 住所自動補完関連のスタイル */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  padding-right: 2.5rem;
}

.input-spinner,
.input-checkmark {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2c5f2d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.input-checkmark {
  color: #28a745;
  font-weight: bold;
  font-size: 1.2rem;
}

.input-wrapper input.valid {
  border-color: #28a745;
  background-color: #f8fff9;
  color: #333;
}

.input-wrapper input.loading {
  border-color: #2c5f2d;
  background-color: #f8f9fa;
  color: #333;
}

.address-loading {
  margin-top: 0.5rem;
}

.address-loading small {
  color: #2c5f2d;
  font-style: italic;
}

.form-hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #6c757d;
  line-height: 1.4;
}

.address-suggestion {
  margin-top: 1rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #333;
}

.suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.suggestion-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.suggestion-text {
  flex: 1;
  color: #2c5f2d;
}

.candidate-count {
  color: #6c757d;
  font-size: 0.9rem;
  font-weight: normal;
}

.close-suggestion {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-suggestion:hover {
  color: #495057;
}

.address-options {
  margin-bottom: 0.75rem;
}

.address-option {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  transition: background-color 0.2s;
  color: #333;
}

.address-option:hover {
  background-color: #e9ecef;
}

.address-option.active {
  background-color: #2c5f2d;
  color: white;
}

.single-address {
  background: white;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #333;
}

.suggestion-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-apply-address {
  background: #2c5f2d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-apply-address:hover {
  background: #1e4220;
}

.payment-section {
  margin: 2rem 0;
}

.payment-section h3 {
  color: #2c5f2d;
  margin-bottom: 1rem;
}

.payment-info-fixed {
  background: #f8f9fa;
  border: 2px solid #2c5f2d;
  border-radius: 10px;
  padding: 1.5rem;
}

.payment-option-fixed {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.payment-icon {
  font-size: 2rem;
  color: #2c5f2d;
}

.payment-details {
  display: flex;
  flex-direction: column;
}

.payment-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c5f2d;
  margin-bottom: 0.25rem;
}

.payment-desc {
  color: #666;
  font-size: 0.95rem;
}

.payment-note {
  border-top: 1px solid #dee2e6;
  padding-top: 1rem;
  margin-top: 1rem;
}

.payment-note p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #495057;
}

.form-actions {
  margin-top: 2rem;
  text-align: center;
}

.submit-btn {
  background: #2c5f2d;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  min-width: 200px;
}

.submit-btn:hover:not(:disabled) {
  background: #1e4220;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
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
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 送料表示のスタイル */
.order-total-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 1rem;
}

.subtotal, .shipping-fee {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.total-amount {
  color: #007bff;
  font-size: 1.2rem;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 2px solid #007bff;
}

.shipping-note {
  color: #666;
  font-size: 0.8rem;
  margin: 0.5rem 0 0 0;
  font-style: italic;
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
  max-width: 400px;
  text-align: center;
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
  .cart-checkout-container {
    padding: 1rem;
    margin: 1rem;
  }

  .checkout-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .checkout-content {
    grid-template-columns: 1fr;
  }

  .summary-item {
    flex-direction: column;
    text-align: center;
  }

  .summary-item-image {
    width: 80px;
    height: 80px;
  }
}
</style>
