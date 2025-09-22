<template>
  <div class="purchase-page">
    <!-- ローディング表示 -->
    <div v-if="loading" class="loading">
      <p>データを読み込み中...</p>
      <div class="loading-spinner"></div>
    </div>

    <!-- エラー表示 -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="$router.push('/')" class="back-button">
        商品一覧に戻る
      </button>
    </div>

    <!-- 商品情報と支払い方法 -->
    <div v-else class="purchase-content">
      <!-- 戻るボタン -->
      <button v-if="!product" class="back-button" @click="$router.push('/')">
        ← 商品一覧に戻る
      </button>

      <template v-else>
      <div class="product-summary">
        <h2 class="order-title">注文商品</h2>
        <img 
          :src="product?.image" 
          :alt="product?.name" 
          class="product-image"
          @error="handleImageError"
          @load="handleImageLoad"
        >
        <div class="product-info">
          <div class="product-details">
            <h2>{{ product?.name }}</h2>
            <p class="price">¥{{ product?.price?.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="purchase-flow">
        <!-- 支払い方法選択 -->
        <div v-if="!selectedPaymentMethod" class="payment-method-selection">
          <h3>お支払い方法を選択してください</h3>
          <div class="payment-options">
            <!-- クレジットカード決済ボタン（設定により有効/無効） -->
            <button 
              v-if="isCreditCardEnabled()"
              class="payment-option" 
              @click="selectPaymentMethod('square')"
            >
              <span class="icon">💳</span>
              <div class="payment-text">
                <span class="payment-title">クレジットカード決済</span>
                <small>（Square決済）</small>
              </div>
            </button>
            
            <!-- クレジットカード決済無効時のメッセージ -->
            <div v-else class="payment-option disabled">
              <span class="icon">💳</span>
              <div class="payment-text">
                <span class="payment-title">クレジットカード決済</span>
                <small class="disabled-message">{{ getCreditCardDisabledMessage() }}</small>
              </div>
            </div>
            
            <button class="payment-option" @click="selectPaymentMethod('bank')">
              <span class="icon">🏦</span>
              <div class="payment-text">
                <span class="payment-title">銀行振込</span>
                <small>（後払い）</small>
              </div>
            </button>
          </div>
          <div class="form-actions">
            <button class="cancel-button" @click="handleBackToProductList">
              商品一覧に戻る
            </button>
          </div>
        </div>

        <!-- 入力フォーム -->
        <form v-else-if="!confirmedOrder && !showPurchaseConfirmation" class="customer-form" @submit.prevent="handleSubmit">
          <h3>お客様情報入力</h3>
          <div class="form-group">
            <label for="name">氏名 <span class="required">*</span></label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              placeholder="例：山田 太郎"
            >
          </div>

          <div class="form-group">
            <label for="phone">電話番号 <span class="required">*</span></label>
            <input
              id="phone"
              v-model="formData.phone"
              type="tel"
              required
              placeholder="例：090-1234-5678"
            >
          </div>

          <div class="form-group">
            <label for="email">メールアドレス <span class="required">*</span></label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              required
              placeholder="例：example@example.com"
            >
          </div>

          <div class="form-group">
            <label for="zipCode">郵便番号 <span class="required">*</span></label>
            <div class="zip-code-container">
              <div class="input-wrapper">
                <input
                  type="tel"
                  id="zipCode"
                  v-model="formData.zipCode"
                  required
                  placeholder="例：100-0001"
                  pattern="[0-9]{3}-[0-9]{4}"
                  maxlength="8"
                  inputmode="numeric"
                  @input="formatZipCode"
                  @paste="handlePaste"
                  @keydown="handleKeydown"
                  autocomplete="postal-code"
                  :class="{ 
                    'valid': isValidZipCode(formData.zipCode) && formData.zipCode.length === 8,
                    'loading': isAddressLoading 
                  }"
                >
                <div v-if="isAddressLoading" class="input-spinner">
                  <div class="spinner"></div>
                </div>
                <div v-else-if="isValidZipCode(formData.zipCode) && formData.zipCode.length === 8" class="input-checkmark">
                  ✓
                </div>
              </div>
              <div v-if="isAddressLoading" class="address-loading">
                <small>住所を検索中...</small>
              </div>
            </div>
            <small class="form-hint">
              数字を入力するとハイフンが自動で挿入されます（例：1234567 → 123-4567）。
              <br>完全な郵便番号を入力すると自動で住所候補を表示します。
              <br><strong>テスト用:</strong> 100-0001（千代田区）、164-0001（中野区）、810-0001（福岡市）
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
                  <input 
                    type="radio" 
                    :id="`address-${index}`" 
                    :value="index" 
                    v-model="selectedSuggestionIndex"
                  >
                  <label :for="`address-${index}`">{{ address.fullAddress }}</label>
                </div>
              </div>
              
              <!-- 選択された住所の表示 -->
              <div class="suggested-address">
                {{ suggestedAddresses[selectedSuggestionIndex]?.fullAddress }}
              </div>
              
              <div class="suggestion-actions">
                <button type="button" class="apply-suggestion primary" @click="replaceSuggestedAddress">
                  この住所を使用
                </button>
                <button 
                  v-if="formData.address.trim()" 
                  type="button" 
                  class="apply-suggestion secondary" 
                  @click="applySuggestedAddress"
                >
                  住所に追加
                </button>
                <button type="button" class="ignore-suggestion" @click="closeSuggestion">
                  手動で入力
                </button>
              </div>
            </div>
            
            <!-- 住所検索エラー -->
            <div v-if="addressError" class="address-error">
              <small class="error-text">{{ addressError }}</small>
            </div>
          </div>

          <div class="form-group">
            <label for="address">住所 <span class="required">*</span></label>
            <textarea
              id="address"
              v-model="formData.address"
              required
              placeholder="例：東京都千代田区千代田1-1&#10;○○マンション101号室"
              rows="3"
            ></textarea>
            <small class="form-hint">都道府県から建物名・部屋番号まで詳しくご記入ください</small>
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-button" @click="backToPreviousStep">
              戻る
            </button>
            <button type="submit" class="submit-button" :disabled="isSubmitting">
              {{ isSubmitting ? '処理中...' : '入力内容を確認' }}
            </button>
          </div>
        </form>

        <!-- 購入確認画面 -->
        <div v-else-if="showPurchaseConfirmation" class="purchase-confirmation">
          <h3>ご注文内容の確認</h3>
          <div class="confirmation-content">
            <div class="order-summary">
              <h4>商品情報</h4>
              <div class="product-summary-mini">
                <img 
                  :src="product?.image" 
                  :alt="product?.name" 
                  class="mini-product-image"
                  @error="handleImageError"
                  @load="handleImageLoad"
                >
                <div>
                  <p class="product-name">{{ product?.name }}</p>
                  <p class="product-price">¥{{ product?.price?.toLocaleString() }}</p>
                </div>
              </div>
            </div>
            
            <div class="customer-summary">
              <h4>お客様情報</h4>
              <dl class="customer-details">
                <dt>お名前</dt>
                <dd>{{ formData.name }}</dd>
                <dt>メールアドレス</dt>
                <dd>{{ formData.email }}</dd>
                <dt>電話番号</dt>
                <dd>{{ formData.phone }}</dd>
                <dt>郵便番号</dt>
                <dd>{{ formattedZipCodeForDisplay }}</dd>
                <dt>住所</dt>
                <dd>{{ formData.address }}</dd>
                <dt>お支払い方法</dt>
                <dd>{{ selectedPaymentMethod === 'bank' ? '銀行振込' : 'クレジットカード決済' }}</dd>
              </dl>
            </div>
          </div>
          
          <div class="confirmation-actions">
            <button type="button" class="cancel-button" @click="backToForm">
              入力内容を修正
            </button>
            <button type="button" class="confirm-button" @click="proceedToPurchase" :disabled="isSubmitting">
              {{ isSubmitting ? '注文処理中...' : 'この内容で注文する' }}
            </button>
          </div>
        </div>

        <!-- 支払い方法に応じたコンポーネント表示 -->
        <template v-else>
          <template v-if="selectedPaymentMethod === 'square' && currentOrder">
            <SquarePaymentForm 
              :order="currentOrder"
              @payment-completed="handlePaymentCompleted"
            />
          </template>
          <template v-else-if="selectedPaymentMethod === 'bank' && currentOrder">
            <BankTransferInfo 
              :order="currentOrder"
              @order-completed="handleOrderCompleted"
            />
          </template>
          <div v-else class="loading">
            <p>データを処理中...</p>
          </div>
        </template>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { getOrCreateCustomerId } from '../lib/customer'
import SquarePaymentForm from './SquarePaymentForm.vue'
import BankTransferInfo from './BankTransferInfo.vue'
import { useAddressLookup } from '../composables/useAddressLookup'
import getPublicImageUrl from '../lib/imageUtils.js'
import { useImageFallback } from '../composables/useImageFallback.js'
import { paymentConfig, isCreditCardEnabled, getCreditCardDisabledMessage } from '../config/paymentConfig.js'
import { sendBankTransferEmail } from '../lib/postmark.js' // メール送信機能を有効化
// definePropsはコンパイラマクロのため、importする必要はありません

const router = useRouter()

// 画像エラーハンドリング
const { handleImageError, handleImageLoad } = useImageFallback()

const selectedPaymentMethod = ref('')
const confirmedOrder = ref(false)
const showPurchaseConfirmation = ref(false) // 購入確認画面の表示状態
const isSubmitting = ref(false)
const loading = ref(true)
const error = ref(null)
const product = ref(null)
const orderData = ref(null)

// 住所自動補完機能
const { 
  fetchAddressByZipCode, 
  formatZipCode: formatZip, 
  isValidZipCode,
  clearDebounce, 
  isLoading: isAddressLoading, 
  error: addressError 
} = useAddressLookup()
const showAddressSuggestion = ref(false)
const suggestedAddresses = ref([])
const selectedSuggestionIndex = ref(0)

// プロパティとして商品IDを受け取る
const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

// フォームデータ
const formData = ref({
  name: '',
  phone: '',
  email: '',
  zipCode: '',
  address: ''
})

// 現在の注文データを計算
const currentOrder = computed(() => {
  if (!orderData.value) return null
  return orderData.value
})

// 商品データ取得
const fetchProduct = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await supabase
      .from('succulents')
      .select('*')
      .eq('id', props.id)
      .single()

    if (fetchError) throw fetchError

    if (!data) {
      throw new Error('商品が見つかりませんでした')
    }

    // 画像URLを公開URLに変換
    product.value = {
      ...data,
      image: getPublicImageUrl(data.image)
    }
  } catch (e) {
    console.error('商品データの取得に失敗:', e)
    error.value = e.message || '商品データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProduct()
})

// 表示用にフォーマットされた郵便番号
const formattedZipCodeForDisplay = computed(() => {
  const zipCode = formData.value.zipCode?.trim() || ''
  if (/^\d{7}$/.test(zipCode)) {
    return zipCode.slice(0, 3) + '-' + zipCode.slice(3)
  }
  return zipCode
})

// 郵便番号の自動フォーマット機能
const formatZipCode = async (event) => {
  const rawValue = event.target.value
  const formattedValue = formatZip(rawValue)
  
  // フォーマットされた値をセット
  formData.value.zipCode = formattedValue
  
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
  } else {
    // 郵便番号が完全でない場合は提案をクリア
    showAddressSuggestion.value = false
    suggestedAddresses.value = []
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

// 提案された住所を採用
const applySuggestedAddress = () => {
  const selectedAddress = suggestedAddresses.value[selectedSuggestionIndex.value]
  if (selectedAddress) {
    // 既存の住所の末尾に追加するか、完全に置き換えるかを判断
    const currentAddress = formData.value.address.trim()
    if (currentAddress) {
      // 既存の住所がある場合は、ユーザーに選択させる
      formData.value.address = selectedAddress.fullAddress + '\n' + currentAddress
    } else {
      // 空の場合は単純に設定
      formData.value.address = selectedAddress.fullAddress
    }
    showAddressSuggestion.value = false
  }
}

// 住所を完全に置き換える
const replaceSuggestedAddress = () => {
  const selectedAddress = suggestedAddresses.value[selectedSuggestionIndex.value]
  if (selectedAddress) {
    formData.value.address = selectedAddress.fullAddress
    showAddressSuggestion.value = false
  }
}

// 住所提案を閉じる
const closeSuggestion = () => {
  showAddressSuggestion.value = false
  suggestedAddresses.value = []
  clearDebounce() // デバウンスタイマーもクリア
}

// ペースト操作の処理
const handlePaste = async (event) => {
  event.preventDefault()
  
  // クリップボードからテキストを取得
  const pastedText = (event.clipboardData || window.clipboardData).getData('text')
  const formattedValue = formatZip(pastedText)
  
  formData.value.zipCode = formattedValue
  
  // 完全な郵便番号の場合は住所検索
  if (isValidZipCode(formattedValue) && formattedValue.length === 8) {
    await lookupAddress(formattedValue)
  }
}

// キーボード操作対応
const handleKeydown = (event) => {
  if (!showAddressSuggestion.value || suggestedAddresses.value.length <= 1) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1, 
        suggestedAddresses.value.length - 1
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
      break
    case 'Enter':
      if (showAddressSuggestion.value) {
        event.preventDefault()
        replaceSuggestedAddress()
      }
      break
    case 'Escape':
      event.preventDefault()
      closeSuggestion()
      break
  }
}

// 支払い方法を選択
const selectPaymentMethod = (method) => {
  selectedPaymentMethod.value = method
}

// 前のステップに戻る
const backToPreviousStep = () => {
  if (confirmedOrder.value) {
    confirmedOrder.value = false
  } else if (selectedPaymentMethod.value) {
    selectedPaymentMethod.value = ''
  } else {
    router.push('/')
  }
}

// 注文を保存（在庫は減らさない）
const saveOrder = async (paymentMethod) => {
  try {
    // 1. 在庫確認と在庫減少
    const { data: stockData, error: stockError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', product.value.id)
      .single()

    if (stockError) {
      console.error('在庫確認エラー:', stockError)
      throw new Error('商品情報の取得に失敗しました')
    }

    if (!stockData || stockData.quantity < 1) {
      throw new Error('申し訳ありません。在庫が不足しています')
    }

    // 在庫を減らす（注文時点で在庫を確保）
    const { error: stockUpdateError } = await supabase
      .from('succulents')
      .update({ 
        quantity: stockData.quantity - 1 
      })
      .eq('id', product.value.id)

    if (stockUpdateError) {
      console.error('在庫更新エラー:', stockUpdateError)
      throw new Error('在庫の更新に失敗しました')
    }

    // 2. 注文データの準備
    const now = new Date().toISOString()
    
    // 郵便番号をフォーマット（ハイフンが無い場合は自動追加）
    let formattedZipCode = formData.value.zipCode.trim()
    if (/^\d{7}$/.test(formattedZipCode)) {
      formattedZipCode = formattedZipCode.slice(0, 3) + '-' + formattedZipCode.slice(3)
    }
    
    const orderDetails = {
      order_number: `ORD${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      product_id: product.value.id,
      product_name: product.value.name,
      product_image: product.value.image,
      price: Number(product.value.price),
      quantity: 1,
      customer_name: formData.value.name.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim(),
      // 郵便番号と住所を統合（カラムがない場合の回避策）
      address: `〒${formattedZipCode}\n${formData.value.address.trim()}`,
      payment_method: paymentMethod,
      status: 'pending_payment', // 全ての注文を最初は決済待ちステータスに
      payment_due_date: paymentMethod === 'bank' 
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : null,
      customer_id: await getOrCreateCustomerId(),
      created_at: now,
      updated_at: now
    }

    // zip_codeカラムが存在する場合は追加
    try {
      // テーブル構造を確認してからzip_codeを追加
      const { error: schemaError } = await supabase
        .from('orders')
        .select('zip_code')
        .limit(1)

      if (!schemaError) {
        orderDetails.zip_code = formattedZipCode // フォーマットされた郵便番号を使用
        // addressも元の形式に戻す
        orderDetails.address = formData.value.address.trim()
      }
    } catch (e) {
      // zip_codeカラムが存在しない場合は統合形式を使用
    }

    // 3. 注文データを保存（在庫は減らさない）
    
    const { data: savedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([orderDetails])
      .select('*')
      .single()

    if (orderError) {
      console.error('注文保存エラー:', orderError)
      console.error('エラーコード:', orderError.code)
      console.error('エラーメッセージ:', orderError.message)
      console.error('エラーデータ:', orderError.details)
      
      // 注文保存に失敗した場合、在庫を元に戻す
      try {
        await supabase
          .from('succulents')
          .update({ 
            quantity: stockData.quantity 
          })
          .eq('id', product.value.id)
      } catch (rollbackError) {
        console.error('在庫復元エラー:', rollbackError)
      }
      
      // データベースカラムエラーの処理
      if (orderError.code === '42703' || (orderError.message && orderError.message.includes('zip_code'))) {
        throw new Error('システムのアップデート中です。管理者にお問い合わせください。\n（郵便番号カラムが見つかりません）')
      }
      
      // 重複注文防止トリガーエラーの処理
      if (orderError.code === 'P0001' && 
          (orderError.message.includes('同じ商品の注文が既に存在します') ||
           orderError.message.includes('prevent_rapid_duplicate_orders') ||
           orderError.message.includes('RAPID_DUPLICATE'))) {
        throw new Error('⚠️ 短時間での重複注文が検出されました\n\n同じ商品を連続でご注文いただく場合は、30秒ほどお待ちいただいてから再度お試しください。\n\n意図的に複数個購入される場合は、お時間をおいてからご注文をお願いいたします。')
      }

      if (orderError.code === '23502') { // Not null violation
        const missingColumn = orderError.message.includes('zip_code') ? '郵便番号' : '必須項目'
        throw new Error(`${missingColumn}が不足しています。\n管理者にお問い合わせください。`)
      }

      if (orderError.code === '23505') { // Unique violation
        throw new Error('申し訳ありません。同じ注文が既に存在します。\n注文履歴をご確認ください。')
      }
      
      throw new Error('注文の保存に失敗しました。もう一度お試しください。')
    }

    if (!savedOrder) {
      throw new Error('注文データが取得できませんでした')
    }

    // 注文保存完了
    
    // 銀行振込注文の場合、メール送信（有効化）
    try {
      console.log('メール送信開始:', savedOrder)
      await sendBankTransferEmail(savedOrder)
      console.log('メール送信成功')
    } catch (emailError) {
      console.error('メール送信エラー詳細:', {
        error: emailError,
        message: emailError.message,
        stack: emailError.stack,
        orderData: savedOrder
      })
      // メール送信に失敗してもエラーにしない（注文は成功扱い）
    }
    
    return savedOrder

  } catch (error) {
    console.error('Error saving order:', error)
    
    // エラーが発生した場合、在庫を元に戻す
    try {
      await supabase
        .from('succulents')
        .update({ 
          quantity: stockData.quantity 
        })
        .eq('id', product.value.id)
    } catch (rollbackError) {
      console.error('在庫復元エラー:', rollbackError)
    }
    
    throw error
  }
}

// フォームの送信処理（確認画面を表示）
const handleSubmit = async (e) => {
  if (isSubmitting.value) {
    alert('処理中です。しばらくお待ちください。')
    return
  }

  if (!selectedPaymentMethod.value) {
    alert('お支払い方法を選択してください。')
    return
  }

  try {
    // 入力値の検証
    const requiredFields = {
      name: 'お名前',
      email: 'メールアドレス',
      phone: '電話番号',
      zipCode: '郵便番号',
      address: 'ご住所'
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !formData.value[key]?.trim())
      .map(([, label]) => label)

    if (missingFields.length > 0) {
      throw new Error(`以下の項目を入力してください：\n${missingFields.join('\n')}`)
    }

    // 郵便番号の形式チェック（より柔軟に）
    const zipCode = formData.value.zipCode.trim()
    const zipCodePattern = /^[0-9]{3}-?[0-9]{4}$/
    if (!zipCodePattern.test(zipCode)) {
      throw new Error('郵便番号は「123-4567」または「1234567」の形式で入力してください。')
    }

    // 商品データの検証
    if (!product.value?.id || !product.value?.name || !product.value?.price) {
      throw new Error('商品情報が不正です。ページを更新してもう一度お試しください。')
    }

    // 確認画面を表示
    showPurchaseConfirmation.value = true

  } catch (error) {
    console.error('入力検証エラー:', error)
    alert(error.message || '入力内容に問題があります。ご確認ください。')
  }
}

// 実際の注文処理
const proceedToPurchase = async () => {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  try {
    // クレジットカード決済の場合も在庫を減らしてから決済画面へ移行
    if (selectedPaymentMethod.value === 'square') {
      // 在庫確認と在庫減少
      const { data: stockData, error: stockError } = await supabase
        .from('succulents')
        .select('quantity')
        .eq('id', product.value.id)
        .single()

      if (stockError) {
        console.error('在庫確認エラー:', stockError)
        throw new Error('商品情報の取得に失敗しました')
      }

      if (!stockData || stockData.quantity < 1) {
        throw new Error('申し訳ありません。在庫が不足しています')
      }

      // 在庫を減らす
      const { error: stockUpdateError } = await supabase
        .from('succulents')
        .update({ 
          quantity: stockData.quantity - 1 
        })
        .eq('id', product.value.id)

      if (stockUpdateError) {
        console.error('在庫更新エラー:', stockUpdateError)
        throw new Error('在庫の更新に失敗しました')
      }
      
      // 郵便番号をフォーマット（ハイフンが無い場合は自動追加）
      let formattedZipCode = formData.value.zipCode.trim()
      if (/^\d{7}$/.test(formattedZipCode)) {
        formattedZipCode = formattedZipCode.slice(0, 3) + '-' + formattedZipCode.slice(3)
      }
      
      // 注文データを準備（DBには保存しない）
      orderData.value = {
        product_id: product.value.id,
        product_name: product.value.name,
        product_image: product.value.image,
        price: Number(product.value.price),
        quantity: 1,
        customer_name: formData.value.name.trim(),
        email: formData.value.email.trim(),
        phone: formData.value.phone.trim(),
        zip_code: formattedZipCode,
        address: formData.value.address.trim(),
        payment_method: 'square'
      }
      
      // 購入確認画面を非表示にして決済画面に移行
      showPurchaseConfirmation.value = false
      confirmedOrder.value = true
      
    } else {
      // 銀行振込の場合は従来通り注文を保存
      const savedOrder = await saveOrder(selectedPaymentMethod.value)

      if (!savedOrder) {
        throw new Error('注文データの保存に失敗しました')
      }

      // 注文データを設定
      orderData.value = savedOrder

      // 購入確認画面を非表示にして注文確認状態に移行
      showPurchaseConfirmation.value = false
      confirmedOrder.value = true
    }

  } catch (error) {
    console.error('注文処理中にエラーが発生しました:', error)
    alert(error.message || 'エラーが発生しました。もう一度お試しください。')
    // エラー時は確認画面に戻る
    showPurchaseConfirmation.value = true
    confirmedOrder.value = false
    orderData.value = null
  } finally {
    isSubmitting.value = false
  }
}

// 商品一覧に戻る処理（確認なしで直接遷移）
const handleBackToProductList = async () => {
  await router.push('/')
}

// クレジットカード決済完了時の処理
const handlePaymentCompleted = () => {
  router.push('/')
}

// 銀行振込注文完了時の処理
const handleOrderCompleted = () => {
  router.push('/')
}

// 確認画面から入力フォームに戻る
const backToForm = () => {
  showPurchaseConfirmation.value = false
  isSubmitting.value = false
}
</script>

<style scoped>
.purchase-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.purchase-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.product-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

.product-info {
  width: 100%;
  display: flex;
  justify-content: center;
}

.product-details {
  text-align: center;
}

.product-details h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.5rem;
}

.product-info .price {
  font-size: 1.75rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.purchase-flow {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.payment-method-selection h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}

.payment-option:hover {
  border-color: #4CAF50;
  transform: translateY(-2px);
}

.payment-option.disabled {
  background: #f8f9fa;
  border-color: #dee2e6;
  cursor: not-allowed;
  opacity: 0.7;
}

.payment-option.disabled:hover {
  border-color: #dee2e6;
  transform: none;
}

.payment-option .icon {
  font-size: 2.5rem;
  line-height: 1;
}

.payment-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.payment-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.payment-option small {
  color: #6c757d;
  font-size: 0.9rem;
  margin-left: 0.5rem;
}

.disabled-message {
  color: #dc3545 !important;
  font-weight: 500 !important;
  font-size: 0.85rem !important;
}

.customer-form {
  margin-top: 2rem;
}

.customer-form h3 {
  color: #333;
  font-size: 1.3rem;
  margin-bottom: 2rem;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 1rem;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.required {
  color: #dc3545;
  margin-left: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.submit-button,
.cancel-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  min-width: 200px;
}

.submit-button {
  background: #4CAF50;
  color: white;
}

.submit-button:hover {
  background: #388E3C;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 1rem auto;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 8px;
  text-align: center;
  color: #856404;
}

.order-title {
  background-color: #f8f9fa;
  color: #333;
  padding: 0.75rem;
  margin: 0 0 1rem;
  border-radius: 4px;
  text-align: center;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* 購入確認画面のスタイル */
.purchase-confirmation {
  margin-top: 2rem;
}

.purchase-confirmation h3 {
  color: #333;
  font-size: 1.3rem;
  margin-bottom: 2rem;
  text-align: center;
}

.confirmation-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
}

.order-summary,
.customer-summary {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.order-summary h4,
.customer-summary h4 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1.1rem;
  border-bottom: 2px solid #4CAF50;
  padding-bottom: 0.5rem;
}

.product-summary-mini {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mini-product-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.product-name {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #333;
}

.product-price {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  color: #4CAF50;
}

.customer-details {
  margin: 0;
}

.customer-details dt {
  font-weight: 600;
  color: #495057;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.customer-details dt:first-child {
  margin-top: 0;
}

.customer-details dd {
  margin: 0 0 0 1rem;
  color: #333;
  background: white;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.confirmation-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.confirm-button {
  padding: 1rem 2rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  min-width: 200px;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.confirm-button:hover:not(:disabled) {
  background: #388E3C;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.confirm-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 住所自動補完機能のスタイル */
.zip-code-container {
  position: relative;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  flex: 1;
  padding-right: 40px; /* アイコン用のスペース */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-wrapper input.valid {
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.input-wrapper input.loading {
  border-color: #2196F3;
}

.input-spinner,
.input-checkmark {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.input-checkmark {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.1rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.address-loading {
  margin-top: 0.5rem;
}

.address-loading small {
  color: #6c757d;
  font-style: italic;
}

.address-suggestion {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-top: 0.75rem;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.suggestion-icon {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.suggestion-text {
  font-weight: 600;
  color: #495057;
  flex: 1;
}

.candidate-count {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: normal;
}

.address-options {
  margin: 0.75rem 0;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.address-option {
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f3f4;
}

.address-option:last-child {
  border-bottom: none;
}

.address-option:hover,
.address-option.active {
  background: #f8f9fa;
}

.address-option input[type="radio"] {
  margin: 0;
}

.address-option label {
  cursor: pointer;
  margin: 0;
  flex: 1;
  font-size: 0.9rem;
}

.close-suggestion {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-suggestion:hover {
  background: #e9ecef;
  color: #495057;
}

.suggested-address {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  color: #495057;
  font-size: 0.95rem;
}

.suggestion-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.apply-suggestion, .ignore-suggestion {
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 100px;
}

.apply-suggestion.primary {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.apply-suggestion.primary:hover {
  background: #45a049;
  border-color: #45a049;
}

.apply-suggestion.secondary {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.apply-suggestion.secondary:hover {
  background: #1976D2;
  border-color: #1976D2;
}

.ignore-suggestion {
  background: white;
  color: #6c757d;
}

.ignore-suggestion:hover {
  background: #f8f9fa;
  color: #495057;
}

.address-error {
  margin-top: 0.5rem;
}

.error-text {
  color: #dc3545;
  font-size: 0.85rem;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .suggestion-actions {
    flex-direction: column;
  }
  
  .apply-suggestion, .ignore-suggestion {
    flex: none;
    width: 100%;
  }
}
</style>
