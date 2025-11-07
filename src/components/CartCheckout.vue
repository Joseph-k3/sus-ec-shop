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
          <small class="form-hint" style="display: block; margin-bottom: 0.5rem;">
            💡 @の前とドメインを別々に入力してください
          </small>
          <div class="email-split-input">
            <input 
              id="emailLocal"
              v-model="emailLocalPart" 
              type="text" 
              required 
              placeholder="例: tanaka.taro"
              @input="updateFullEmail"
              class="email-local-part"
            />
            <span class="email-at">@</span>
            <select 
              v-model="emailDomain"
              @change="updateFullEmail"
              required
              class="email-domain-select"
            >
              <option value="" disabled>ドメインを選択してください</option>
              <option value="gmail.com">gmail.com</option>
              <option value="yahoo.co.jp">yahoo.co.jp</option>
              <option value="docomo.ne.jp">docomo.ne.jp</option>
              <option value="ezweb.ne.jp">ezweb.ne.jp</option>
              <option value="softbank.ne.jp">softbank.ne.jp</option>
              <option value="icloud.com">icloud.com</option>
              <option value="outlook.com">outlook.com</option>
              <option value="outlook.jp">outlook.jp</option>
              <option value="hotmail.com">hotmail.com</option>
              <option value="live.jp">live.jp</option>
              <option value="custom">🔧 その他（手動入力）</option>
            </select>
          </div>
          
          <!-- カスタムドメイン入力 -->
          <div v-if="emailDomain === 'custom'" class="custom-domain-input">
            <input 
              v-model="customEmailDomain"
              type="text"
              placeholder="例: example.com"
              @input="updateFullEmail"
              class="custom-domain-field"
            />
          </div>
          
          <!-- 完成したメールアドレス表示 -->
          <div v-if="form.email" class="email-preview">
            <span class="preview-label">📧 入力されたメールアドレス:</span>
            <span class="preview-email" :class="{ 
              'valid': isEmailValid && form.email && form.emailConfirm && form.email === form.emailConfirm,
              'invalid': form.email && form.emailConfirm && form.email !== form.emailConfirm
            }">{{ form.email }}</span>
            <span v-if="form.email && form.emailConfirm && form.email === form.emailConfirm" class="preview-check">✓</span>
            <span v-else-if="form.email && form.emailConfirm && form.email !== form.emailConfirm" class="preview-error">✗</span>
          </div>
        </div>

        <div class="form-group">
          <label for="emailConfirm">メールアドレス（確認用） *</label>
          <small class="form-hint" style="display: block; margin-bottom: 0.5rem;">
            💡 上と同じように入力してください
          </small>
          <div class="email-split-input">
            <input 
              id="emailConfirmLocal"
              v-model="emailConfirmLocalPart" 
              type="text" 
              required 
              placeholder="例: tanaka.taro"
              @input="updateFullEmailConfirm"
              @paste="handleEmailPaste"
              class="email-local-part"
            />
            <span class="email-at">@</span>
            <select 
              v-model="emailConfirmDomain"
              @change="updateFullEmailConfirm"
              required
              class="email-domain-select"
            >
              <option value="" disabled>ドメインを選択してください</option>
              <option value="gmail.com">gmail.com</option>
              <option value="yahoo.co.jp">yahoo.co.jp</option>
              <option value="docomo.ne.jp">docomo.ne.jp</option>
              <option value="ezweb.ne.jp">ezweb.ne.jp</option>
              <option value="softbank.ne.jp">softbank.ne.jp</option>
              <option value="icloud.com">icloud.com</option>
              <option value="outlook.com">outlook.com</option>
              <option value="outlook.jp">outlook.jp</option>
              <option value="hotmail.com">hotmail.com</option>
              <option value="live.jp">live.jp</option>
              <option value="custom">🔧 その他（手動入力）</option>
            </select>
          </div>
          
          <!-- カスタムドメイン入力（確認用） -->
          <div v-if="emailConfirmDomain === 'custom'" class="custom-domain-input">
            <input 
              v-model="customEmailConfirmDomain"
              type="text"
              placeholder="例: example.com"
              @input="updateFullEmailConfirm"
              @paste="handleEmailPaste"
              class="custom-domain-field"
            />
          </div>
          
          <!-- 完成したメールアドレス表示（確認用） -->
          <div v-if="form.emailConfirm" class="email-preview">
            <span class="preview-label">📧 確認用メールアドレス:</span>
            <span class="preview-email" :class="{ 
              'valid': form.email && form.emailConfirm && form.email === form.emailConfirm,
              'invalid': form.emailConfirm && form.email !== form.emailConfirm
            }">{{ form.emailConfirm }}</span>
            <span v-if="form.email && form.emailConfirm && form.email === form.emailConfirm" class="preview-check">✓</span>
            <span v-else-if="form.emailConfirm && form.email !== form.emailConfirm" class="preview-error">✗</span>
          </div>
          
          <div v-if="emailMismatchError" class="email-error-message">
            {{ emailMismatchError }}
          </div>
          <small v-if="form.email && form.emailConfirm && form.email === form.emailConfirm" class="success-text">
            ✓ メールアドレスが一致しました
          </small>
          <small v-else-if="form.email && form.emailConfirm && form.email !== form.emailConfirm" class="error-text">
            ⚠️ メールアドレスが一致しません
          </small>
          <small v-else class="form-hint">
            確認のため、同じメールアドレスを再度入力してください
          </small>
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
            数字を入力するとハイフンが自動で挿入されます。<br>（例：1234567 → 123-4567）<br>
            完全な郵便番号を入力すると自動で住所候補を表示します。<br>
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

        <!-- 決済方法選択 -->
        <div class="payment-section">
          <h3>💳 お支払い方法</h3>
          <div class="payment-methods">
            <!-- Square決済 -->
            <div 
              class="payment-option" 
              :class="{ active: form.paymentMethod === 'square' }"
              @click="form.paymentMethod = 'square'"
            >
              <input 
                type="radio" 
                id="payment-square" 
                value="square" 
                v-model="form.paymentMethod"
              />
              <label for="payment-square">
                <span class="payment-icon">💳</span>
                <div class="payment-details">
                  <span class="payment-title">クレジットカード決済（Square）</span>
                  <span class="payment-desc">カード情報入力後、即座に決済実行</span>
                </div>
              </label>
            </div>

            <!-- 銀行振込 -->
            <div 
              class="payment-option" 
              :class="{ active: form.paymentMethod === 'bank_transfer' }"
              @click="form.paymentMethod = 'bank_transfer'"
            >
              <input 
                type="radio" 
                id="payment-bank" 
                value="bank_transfer" 
                v-model="form.paymentMethod"
              />
              <label for="payment-bank">
                <span class="payment-icon">🏦</span>
                <div class="payment-details">
                  <span class="payment-title">銀行振込</span>
                  <span class="payment-desc">注文確定後、振込先をメールでお知らせいたします</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 決済方法の説明 -->
          <div class="payment-note">
            <div v-if="form.paymentMethod === 'square'">
              <p>✓ クレジットカードで即座にお支払いいただけます</p>
              <p>✓ 決済完了後、すぐに発送準備に入ります</p>
            </div>
            <div v-else-if="form.paymentMethod === 'bank_transfer'">
              <p>※ お振込確認後に商品を発送いたします</p>
              <p>※ お支払期限は注文確定から72時間以内です</p>
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
    <div v-if="message" class="message-overlay">
      <div class="message-box" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { supabase } from '../lib/supabase'
import { getOrCreateCustomerId } from '../lib/customerUtils'
import { sendCartOrderEmail } from '../lib/mailgun' // Mailgunを使用したメール送信
import { useAddressLookup } from '../composables/useAddressLookup'
import { calculateTotalWithShipping } from '../lib/shipping.js' // 送料計算機能
import { 
  createSquareCheckout, 
  checkProductStock,
  generateOrderNumber,
  calculatePaymentDueDate
} from '../lib/squarePayment' // Square決済用ヘルパー

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
  emailConfirm: '',
  phone: '',
  postal: '',
  address: '',
  notes: '',
  paymentMethod: 'square' // デフォルトはSquare決済
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

// メールアドレス関連
const emailLocalPart = ref('')
const emailDomain = ref('')
const customEmailDomain = ref('')
const emailConfirmLocalPart = ref('')
const emailConfirmDomain = ref('')
const customEmailConfirmDomain = ref('')
const emailMismatchError = ref('')

// メールアドレスを更新
const updateFullEmail = () => {
  const domain = emailDomain.value === 'custom' ? customEmailDomain.value : emailDomain.value
  if (emailLocalPart.value && domain) {
    form.email = `${emailLocalPart.value}@${domain}`
  } else {
    form.email = ''
  }
  handleEmailConfirmInput()
}

// 確認用メールアドレスを更新
const updateFullEmailConfirm = () => {
  const domain = emailConfirmDomain.value === 'custom' ? customEmailConfirmDomain.value : emailConfirmDomain.value
  if (emailConfirmLocalPart.value && domain) {
    form.emailConfirm = `${emailConfirmLocalPart.value}@${domain}`
  } else {
    form.emailConfirm = ''
  }
  handleEmailConfirmInput()
}

const showEmailDomainSuggestions = ref(false)
const emailDomainSuggestions = ref([])
const commonEmailDomains = [
  '@gmail.com',
  '@yahoo.co.jp',
  '@docomo.ne.jp',
  '@ezweb.ne.jp',
  '@softbank.ne.jp',
  '@icloud.com',
  '@outlook.com',
  '@outlook.jp',
  '@hotmail.com',
  '@live.jp'
]

// メールアドレスのバリデーション
const isEmailValid = computed(() => {
  if (!form.email) return false
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(form.email)
})

// メールアドレス確認欄の入力時の処理
const handleEmailConfirmInput = () => {
  emailMismatchError.value = ''
  
  // 両方のフィールドに入力がある場合のみチェック
  if (form.email && form.emailConfirm) {
    if (form.email !== form.emailConfirm) {
      emailMismatchError.value = 'メールアドレスが一致しません'
    }
  }
}

// ペースト防止（確認用メールアドレス）
const handleEmailPaste = (e) => {
  e.preventDefault()
  emailMismatchError.value = 'セキュリティのため、メールアドレスはコピー＆ペーストではなく手入力してください'
  setTimeout(() => {
    emailMismatchError.value = ''
  }, 3000)
}

onMounted(() => {
  // カートが空の場合はカート画面にリダイレクト
  if (cart.items.length === 0) {
    router.push('/cart')
  }
  
  // 初期送料計算
  updateShippingInfo()
})

const submitOrder = async () => {
  if (cart.items.length === 0) {
    showMessage('カートに商品がありません', 'error')
    return
  }

  // メールアドレスの一致チェック
  if (form.email !== form.emailConfirm) {
    showMessage('メールアドレスと確認用メールアドレスが一致しません', 'error')
    return
  }

  // メールアドレスの形式チェック
  if (!isEmailValid.value) {
    showMessage('メールアドレスの形式が正しくありません', 'error')
    return
  }

  isSubmitting.value = true

  try {
    const customerId = getOrCreateCustomerId()
    
    // 1. 在庫チェック
    await checkProductStock(cart.items)
    
    // 郵便番号をフォーマット
    let formattedZipCode = form.postal.trim()
    if (/^\d{7}$/.test(formattedZipCode)) {
      formattedZipCode = formattedZipCode.slice(0, 3) + '-' + formattedZipCode.slice(3)
    }

    // Square決済の場合
    if (form.paymentMethod === 'square') {
      // カート注文用の統一注文番号を生成
      const cartOrderNumber = generateOrderNumber('CART')
      const now = new Date().toISOString()
      
      // 各商品ごとに注文を作成（ステータスはpending_payment）
      const orderPromises = cart.items.map(async (item, index) => {
        const individualOrderNumber = `${cartOrderNumber}_${index + 1}`
        
        const orderData = {
          order_number: individualOrderNumber,
          customer_id: customerId,
          product_id: item.id,
          product_name: item.name,
          product_image: item.image,
          price: item.price,
          quantity: item.quantity,
          customer_name: form.customerName,
          email: form.email,
          phone: form.phone,
          payment_method: form.paymentMethod,
          status: 'pending_payment',
          payment_status: 'pending',
          created_at: now,
          updated_at: now,
        }

        // 住所にカートグループIDと送料情報を含める
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
            orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
          }
        } catch (e) {
          orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
        }

        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()

        if (error) throw error
        return data[0]
      })

      await Promise.all(orderPromises)
      
      // Square決済のデータを準備
      const orderData = {
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        postal: formattedZipCode,
        address: form.address,
        notes: form.notes,
        items: cart.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        shippingFee: shippingInfo.value.shippingFee,
        shippingRegion: shippingInfo.value.region,
        totalAmount: shippingInfo.value.totalAmount,
        redirectUrl: window.location.origin,
        cartOrderNumber: cartOrderNumber // Webhook用の注文番号
      }

      // Square Checkoutセッションを作成
      const checkoutResult = await createSquareCheckout(orderData)
      
      console.log('🔍 Square Checkout結果:', checkoutResult)
      console.log('🔍 Order ID:', checkoutResult.orderId)
      console.log('🔍 Payment Link ID:', checkoutResult.paymentLinkId)
      
      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        throw new Error('決済ページの作成に失敗しました')
      }

      // 注文IDをデータベースに更新（Webhook時の照合用）
      const updateResult = await supabase
        .from('orders')
        .update({ 
          square_order_id: checkoutResult.orderId,
          square_payment_link_id: checkoutResult.paymentLinkId
        })
        .ilike('order_number', `${cartOrderNumber}%`)
        .select()
      
      console.log('🔍 DB更新結果:', updateResult)
      
      if (updateResult.error) {
        console.error('❌ DB更新エラー:', updateResult.error)
        throw new Error(`注文IDの保存に失敗しました: ${updateResult.error.message}`)
      }
      
      if (!updateResult.data || updateResult.data.length === 0) {
        console.error('❌ 更新対象の注文が見つかりませんでした')
        console.error('検索した注文番号パターン:', `${cartOrderNumber}%`)
        // 警告だけ表示して続行（決済自体は成功する可能性がある）
        console.warn('⚠️ 警告: 注文IDの保存に失敗しましたが、決済処理は続行します')
      } else {
        console.log(`✅ ${updateResult.data.length}件の注文を更新しました`)
      }

      // 注文情報をlocalStorageに保存（決済完了後の画面で使用）
      localStorage.setItem('pendingSquareOrder', JSON.stringify({
        orderData,
        cartOrderNumber: cartOrderNumber, // カート注文番号を追加
        squareOrderId: checkoutResult.orderId,
        paymentLinkId: checkoutResult.paymentLinkId,
        timestamp: Date.now()
      }))

      // Square決済ページにリダイレクト
      window.location.href = checkoutResult.checkoutUrl
      return
    }
    
    // 銀行振込の場合（既存のロジック）
    const cartOrderNumber = generateOrderNumber('CART')
    const now = new Date().toISOString()
    const paymentDueDate = calculatePaymentDueDate(48)
    
    // 各商品ごとに注文を作成
    // 注意: 在庫チェックと減少はデータベーストリガー（check_and_decrease_stock_on_order）で自動的に行われます
    const orderPromises = cart.items.map(async (item, index) => {
      const individualOrderNumber = `${cartOrderNumber}_${index + 1}`
      
      const orderData = {
        order_number: individualOrderNumber,
        customer_id: customerId,
        product_id: item.id,
        product_name: item.name,
        product_image: item.image,
        price: item.price,
        quantity: item.quantity,
        customer_name: form.customerName,
        email: form.email,
        phone: form.phone,
        payment_method: form.paymentMethod,
        status: 'pending_payment',
        payment_due_date: paymentDueDate,
        created_at: now,
        updated_at: now
      }

      // 住所にカートグループIDと送料情報を含める
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
          orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
        }
      } catch (e) {
        orderData.address = `〒${formattedZipCode}\n${addressWithCartGroup}`
      }

      console.log('📝 注文データ:', {
        order_number: orderData.order_number,
        product_id: orderData.product_id,
        product_name: orderData.product_name,
        quantity: orderData.quantity,
        payment_method: orderData.payment_method,
        status: orderData.status
      })
      
      console.log('🔄 注文をSupabaseに送信中...')

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()

      if (error) {
        console.error('❌ 注文作成エラー:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          product_id: orderData.product_id,
          product_name: orderData.product_name,
          quantity: orderData.quantity
        })
        throw error
      }
      
      console.log('✅ 注文作成成功:', data[0])
      
      // 注文後の在庫確認（デバッグ用）
      const { data: productAfter, error: fetchError } = await supabase
        .from('succulents')
        .select('quantity')
        .eq('id', item.id)
        .single()
      
      if (!fetchError) {
        console.log(`📦 商品 ${item.name} の注文後在庫: ${productAfter.quantity}個`)
      }
      return data[0]
    })

    const orders = await Promise.all(orderPromises)

    // メール送信（銀行振込のみ）
    try {
      await sendCartOrderEmail({
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        postal: form.postal,
        address: form.address,
        items: cart.items,
        itemTotal: cart.totalAmount,
        shippingFee: shippingInfo.value.shippingFee,
        shippingRegion: shippingInfo.value.region,
        totalAmount: shippingInfo.value.totalAmount,
        paymentMethod: form.paymentMethod,
        notes: form.notes
      })
    } catch (emailError) {
      console.error('メール送信エラー:', emailError)
    }

    // カートを空にする
    cart.items.splice(0)
    cart.saveCartToStorage()

    showMessage('ご注文ありがとうございます！\n注文が正常に完了いたしました。\n\n5秒後に注文履歴画面に移動します...', 'success')
    
    // 5秒後に注文履歴画面に遷移
    setTimeout(() => {
      router.push('/my-orders')
    }, 5000)

  } catch (error) {
    console.error('🚨 注文処理エラー:', error)
    console.error('📋 エラーの詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
      name: error.name,
      // エラーオブジェクト全体も出力
      fullError: JSON.stringify(error, null, 2)
    })
    
    // エラーが発生した場合、在庫復元は不要（トリガーがロールバックする）
    
    // エラーメッセージを解析してユーザーフレンドリーなメッセージを表示
    let userMessage = '注文処理中にエラーが発生しました。'
    let errorDetails = ''
    
    if (error.code === 'P0001' || (error.message && error.message.includes('在庫が不足しています'))) {
      // 在庫不足エラー
      userMessage = '🚫 申し訳ありません。カート内の一部商品が在庫切れになりました。\n\n他のお客様が先にご購入されたため、現在在庫がございません。\nカートを確認して商品を調整してください。'
    } else if (error.message && error.message.includes('商品が見つかりません')) {
      // 商品削除エラー
      userMessage = '⚠️ カート内の一部商品が削除されています。\nカートを確認してください。'
    } else if (error.code === '23505') {
      // 重複エラー
      userMessage = '⚠️ この注文は既に処理されています。\n注文履歴をご確認ください。'
    } else if (error.code === '42P01') {
      // テーブルが存在しない
      userMessage = '⚠️ データベースエラーが発生しました。\n管理者に連絡してください。'
      errorDetails = 'テーブルが見つかりません'
    } else if (error.code === '42703') {
      // カラムが存在しない
      userMessage = '⚠️ データベースエラーが発生しました。\n管理者に連絡してください。'
      errorDetails = 'カラムが見つかりません'
    } else if (error.message) {
      userMessage = `注文処理中にエラーが発生しました: ${error.message}`
      if (error.details) {
        errorDetails = `\n詳細: ${error.details}`
      }
    }
    
    console.error('🔍 ユーザーメッセージ:', userMessage)
    if (errorDetails) {
      console.error('🔍 エラー詳細:', errorDetails)
    }
    
    showMessage(userMessage + errorDetails, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const showMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  
  // ダイアログ表示時にページトップへスムーズにスクロール
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
  
  // エラーメッセージのみ8秒後に自動で消す
  // 成功メッセージは画面遷移時に自然に消えるので自動では消さない
  if (type === 'error') {
    setTimeout(() => {
      message.value = ''
    }, 8000)
  }
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
  width: 80px;
  height: 80px;
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
  color: #1a1a1a;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.summary-item-price {
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
}

.summary-item-subtotal {
  font-weight: bold;
  color: #1a1a1a;
  font-size: 1.05rem;
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
  color: #333;
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

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.payment-option {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 10px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.payment-option:hover {
  border-color: #2c5f2d;
  background: #f0f8f0;
}

.payment-option.active {
  border-color: #2c5f2d;
  background: #e8f5e9;
  box-shadow: 0 0 0 3px rgba(44, 95, 45, 0.1);
}

.payment-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.payment-option label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  margin: 0;
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
  font-size: 1.1rem;
  font-weight: bold;
  color: #2c5f2d;
  margin-bottom: 0.25rem;
}

.payment-desc {
  color: #666;
  font-size: 0.9rem;
}

.payment-note {
  background: #f0f8f0;
  border-radius: 8px;
  padding: 1rem;
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
  z-index: 10; /* z-indexを下げる */
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

/* 古い.message定義は削除（下部に統一した定義あり） */

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
  color: #333;
  font-size: 0.95rem;
  margin: 0;
  font-weight: 500;
}

.total-amount {
  color: #1a1a1a;
  font-size: 1.3rem;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 2px solid #2c5f2d;
  font-weight: bold;
}

.shipping-note {
  color: #555;
  font-size: 0.85rem;
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

/* メールアドレス入力関連のスタイル */
/* メールアドレス分割入力 */
.email-split-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.email-local-part {
  flex: 1;
  min-width: 0;
}

.email-at {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c5f2d;
  flex-shrink: 0;
  padding: 0 0.5rem;
}

.email-domain-select {
  flex: 1.2;
  min-width: 150px;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  appearance: auto;
  -webkit-appearance: menulist;
  -moz-appearance: menulist;
}

.email-domain-select:hover {
  border-color: #2c5f2d;
  background: #f8fff9;
}

.email-domain-select:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 3px rgba(44, 95, 45, 0.15);
  background: #f8fff9;
}

.email-domain-select option {
  padding: 0.5rem;
  background: white;
  color: #333;
  font-size: 1rem;
}

.email-domain-select option:disabled {
  color: #999;
  font-style: italic;
}

.custom-domain-input {
  margin-top: 0.5rem;
}

.custom-domain-field {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  color: #333;
  background-color: #fffbf0;
}

.custom-domain-field:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 2px rgba(44, 95, 45, 0.1);
}

.email-preview {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #dee2e6;
}

.preview-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.preview-email {
  font-size: 1rem;
  color: #2c5f2d;
  font-weight: 600;
  flex: 1;
}

.preview-email.valid {
  color: #28a745;
}

.preview-email.invalid {
  color: #dc3545;
}

.preview-check {
  color: #28a745;
  font-size: 1.25rem;
  font-weight: bold;
}

.preview-error {
  color: #dc3545;
  font-size: 1.25rem;
  font-weight: bold;
}

.email-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.email-input-wrapper input {
  flex: 1;
  padding-right: 2.5rem;
  color: #333;
}

.email-input-wrapper input.valid {
  border-color: #28a745;
  background-color: #f0fff4;
}

.email-input-wrapper input.error,
.email-input-wrapper input.invalid {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.input-checkmark {
  position: absolute;
  right: 0.75rem;
  color: #28a745;
  font-size: 1.25rem;
  font-weight: bold;
  pointer-events: none;
}

.input-error-mark {
  position: absolute;
  right: 0.75rem;
  color: #dc3545;
  font-size: 1.25rem;
  font-weight: bold;
  pointer-events: none;
}

.email-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dee2e6;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: -1px;
}

.email-suggestion-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
  border: none;
  background: none;
  width: 100%;
  font-size: 0.95rem;
  color: #333;
}

.email-suggestion-item:hover {
  background-color: #f8f9fa;
}

.email-suggestion-item:active {
  background-color: #e9ecef;
}

.email-error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.error-text {
  display: block;
  margin-top: 0.5rem;
  color: #dc3545;
  font-size: 0.875rem;
  font-weight: 500;
}

.success-text {
  display: block;
  margin-top: 0.5rem;
  color: #28a745;
  font-size: 0.875rem;
  font-weight: 500;
}

@media screen and (max-width: 768px) {
  .email-suggestions {
    max-height: 150px;
  }
  
  .email-suggestion-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }
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
    z-index: 10;
  }

  .cart-checkout-container {
    padding-bottom: 3rem;
  }
  
  .form-actions {
    margin-bottom: 2rem;
  }
  
  .submit-btn {
    min-width: 150px;
    font-size: 1rem;
    padding: 0.8rem 1.2rem;
  }
}

/* メッセージ表示（ビューポート中央に確実に配置） */
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
</style>
