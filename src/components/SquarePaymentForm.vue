<template>
  <div class="square-payment-form">
    <!-- 購入確認画面 -->
    <div v-if="showPurchaseConfirmation" class="purchase-confirmation">
      <div class="confirmation-content">
        <h2>ご注文内容の確認</h2>
        
        <div class="order-summary">
          <h3>ご注文商品</h3>
          <div class="product-info">
            <img :src="getPublicImageUrl(order.product_image)" :alt="order.product_name" class="product-thumbnail">
            <div>
              <h4>{{ order.product_name }}</h4>
              <p class="price">¥{{ order.price.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="customer-info">
  .payment-form h3 {
  color: #2d5016;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.postal-code-notice {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.postal-code-notice p {
  margin: 0;
  font-size: 14px;
  color: #1565c0;
}

.card-form { <h3>お客様情報</h3>
          <dl>
            <dt>お名前</dt>
            <dd>{{ order.customer_name }}</dd>
            <dt>電話番号</dt>
            <dd>{{ order.phone }}</dd>
            <dt>メールアドレス</dt>
            <dd>{{ order.email }}</dd>
            <dt>郵便番号</dt>
            <dd>{{ order.zip_code }}</dd>
            <dt>住所</dt>
            <dd>{{ order.address }}</dd>
          </dl>
        </div>

        <div class="payment-method-info">
          <h3>お支払い方法</h3>
          <p class="payment-method">クレジットカード決済</p>
          <p class="security-note">※ カード情報は安全に暗号化されて処理されます</p>
        </div>

        <div class="confirmation-actions">
          <button 
            class="primary-button" 
            @click="proceedToPayment"
            :disabled="isProcessing"
          >
            クレジットカード決済に進む
          </button>
          <button 
            class="secondary-button" 
            @click="handleBackToProductList"
            :disabled="isProcessing"
          >
            商品一覧に戻る
          </button>
        </div>
      </div>
    </div>

    <!-- 決済画面 -->
    <div v-else class="payment-section">
      <div class="order-summary">
        <h3>ご注文内容</h3>
        <div class="product-info">
          <img :src="getPublicImageUrl(order.product_image)" :alt="order.product_name" class="product-thumbnail">
          <div>
            <h4>{{ order.product_name }}</h4>
            <p class="price">¥{{ order.price.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="payment-form">
        <h3>クレジットカード情報入力</h3>
        <div class="payment-info-message">
          <p>以下のクレジットカード情報を入力し、決済を実行してください。</p>
        </div>
        <!-- 追加: 郵便番号表示欄 -->
        <div class="custom-zip-code-field">
          <label for="custom-zip-code"><strong>郵便番号</strong></label>
          <input id="custom-zip-code" type="text" :value="order.zip_code" readonly style="width:120px; margin-left:8px; font-size:1.1em; background:#f8f9fa; border:1px solid #ccc; border-radius:4px; padding:4px 8px; color:#333;" />
        </div>
        <div v-if="!paymentFormLoaded" class="loading">
          カード決済フォームを読み込み中...
        </div>
        <!-- カードコンテナを常に表示し、読み込み状態に応じて表示/非表示を切り替え -->
        <div class="card-form" :class="{ 'loading-state': !paymentFormLoaded }">
          <div id="card-container" style="min-height: 100px;"></div>
          <div id="payment-status-container" class="payment-status"></div>
        </div>
        <div class="payment-notice">
          <p>※ クレジットカード情報は安全に処理され、当社のサーバーには保存されません。</p>
          <p>※ 対応カードブランド：VISA, Mastercard, JCB, American Express</p>
          <div class="test-cards-info">
            <p><strong>🔧 テスト環境での動作確認用カード番号：</strong></p>
            <ul>
              <li><strong>VISA:</strong> 4111 1111 1111 1111</li>
              <li><strong>Mastercard:</strong> 5105 1051 0510 5100</li>
              <li><strong>American Express:</strong> 3714 496353 98431</li>
              <li><strong>有効期限:</strong> 未来の日付（例：12/25）</li>
              <li><strong>CVV:</strong> 任意の3桁（例：123）</li>
            </ul>
            <p class="test-note">※ 上記番号を使用しても実際の決済は発生しません</p>
          </div>
        </div>
      </div>

      <div class="error-message" v-if="error">
        {{ error }}
      </div>

      <div class="actions">
        <button 
          class="primary-button" 
          @click="handlePayment" 
          :disabled="isProcessing || !paymentFormLoaded"
        >
          {{ isProcessing ? '決済処理中...' : '決済を実行する' }}
        </button>
        <button 
          class="secondary-button" 
          @click="showPurchaseConfirmation = true" 
          :disabled="isProcessing"
        >
          確認画面に戻る
        </button>
        <button 
          class="tertiary-button" 
          @click="handleBackToProductList" 
          :disabled="isProcessing"
        >
          商品一覧に戻る
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { initializeSquare, createCardPaymentForm, processPayment } from '../lib/square'
import { supabase } from '../lib/supabase'
import { decreaseProductStock } from '../lib/decreaseStock'
import { getOrCreateCustomerId } from '../lib/customer'
import { sendPaymentConfirmationEmail } from '../lib/mailgun'
import getPublicImageUrl from '../lib/imageUtils.js'

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const isProcessing = ref(false)
const error = ref('')
const paymentFormLoaded = ref(false)
const showPurchaseConfirmation = ref(true) // 最初に確認画面を表示
let card = null

// 重複決済防止のためのフラグ
let isPaymentInProgress = false
let lastPaymentAttempt = 0
const PAYMENT_COOLDOWN = 3000 // 3秒のクールダウン

// 商品一覧に戻る処理（ダイアログ付き）
const handleBackToProductList = async () => {
  const confirmed = window.confirm(
    '商品一覧画面に戻りますか？\n\n' +
    '※ ご入力いただいた注文情報は保存されており、\n' +
    '「ご注文履歴」から確認・決済の続行が可能です。\n\n' +
    '注文ステータス：お支払い待ち'
  )
  
  if (confirmed) {
    // 少し待機してから注文履歴へのナビゲーションメッセージを表示
    setTimeout(() => {
      alert('ご注文情報が保存されました。\n\n「ご注文履歴」ボタンから注文状況をご確認いただけます。\n決済のお手続きもそちらから可能です。')
    }, 500)
    
    await router.push('/')
  }
}
const proceedToPayment = async () => {
  showPurchaseConfirmation.value = false
  
  // DOM更新を待つ
  await nextTick()
  
  // 少し待機してからSquare決済フォームを初期化
  setTimeout(async () => {
    await initializeSquareForm()
  }, 300)
}

// Square決済フォームの初期化
const initializeSquareForm = async () => {
  try {
    
    // カードコンテナが存在するかチェック
    const cardContainer = document.getElementById('card-container')
    if (!cardContainer) {
      throw new Error('カードコンテナ要素が見つかりません')
    }
    
    // 郵便番号をdata属性として設定（CSS content表示用）
    cardContainer.setAttribute('data-zip-code', props.order.zip_code || '未設定')

    const payments = await initializeSquare()
    
    card = await createCardPaymentForm(payments, props.order.zip_code)
    paymentFormLoaded.value = true

    // --- ここからダミー郵便番号自動入力 ---
    setTimeout(() => {
      // Squareの郵便番号inputを探してダミー値（7桁）を自動入力
      const postalInput = document.querySelector('input[placeholder*="ZIP"], input[placeholder*="Postal"], input[name*="postal"], input[name*="zip"]');
      if (postalInput && postalInput.value.length < 7) {
        postalInput.value = '1000001'; // 日本の7桁郵便番号形式
        postalInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 500);
    // --- ここまで ---

  } catch (err) {
    console.error('❌ Square決済フォームの初期化に失敗しました:', err)
    console.error('❌ エラー詳細:', err.message)
    console.error('❌ スタック:', err.stack)
    error.value = '決済フォームの読み込みに失敗しました。ページを更新してください。'
  }
}

// 決済処理
const handlePayment = async () => {
  const now = Date.now()
  
  // 重複決済防止チェック（強化版）
  if (isPaymentInProgress) {
    error.value = '決済処理中です。しばらくお待ちください。'
    return
  }

  // クールダウン期間中の重複実行を防止
  if (now - lastPaymentAttempt < PAYMENT_COOLDOWN) {
    error.value = `決済処理は${Math.ceil((PAYMENT_COOLDOWN - (now - lastPaymentAttempt)) / 1000)}秒後に実行できます。`
    return
  }

  if (!card) {
    error.value = '決済フォームが正しく初期化されていません'
    return
  }

  // フラグとタイムスタンプを設定
  isProcessing.value = true
  isPaymentInProgress = true
  lastPaymentAttempt = now
  error.value = ''

  let orderData = null // 注文データを追跡するため

  try {
    // デバッグ: 注文データを確認
    
    // 事前バリデーション（郵便番号）- 簡素化版
    if (!props.order.zip_code) {
      throw new Error('郵便番号が設定されていません。注文画面からやり直してください。')
    }
    
    // 郵便番号のフォーマット（前画面で検証済みなので最小限のチェック）
    let formattedZipCode = props.order.zip_code.trim()
    
    // ハイフンが無い場合のみ自動追加（エラーにはしない）
    if (/^\d{7}$/.test(formattedZipCode)) {
      formattedZipCode = formattedZipCode.slice(0, 3) + '-' + formattedZipCode.slice(3)
    }
    

    // 1. 在庫チェック
    const { data: stockCheck, error: stockError } = await supabase
      .from('succulents')
      .select('quantity')
      .eq('id', props.order.product_id)
      .single()

    if (stockError || !stockCheck || stockCheck.quantity <= 0) {
      throw new Error('申し訳ございませんが、この商品は在庫切れです。')
    }

    // 2. カードのトークン化
    let result
    try {
      result = await card.tokenize()
    } catch (tokenizeError) {
      console.error('カードトークン化でエラー発生:', tokenizeError)
      throw tokenizeError
    }
    
    if (result.status !== 'OK') {
      console.error('トークン化失敗:', result.errors)
      throw new Error(result.errors[0]?.message || 'カード情報の処理に失敗しました')
    }


    // 3. Square APIで決済処理
    let paymentResult = null
    try {
      paymentResult = await processPayment(card, props.order.price, formattedZipCode)
      if (paymentResult.status !== 'success') {
        throw new Error('テスト決済に失敗しました')
      }
    } catch (paymentError) {
      console.error('❌ 決済処理エラー:', paymentError)
      console.error('❌ エラースタック:', paymentError.stack)
      throw new Error(`決済処理に失敗しました: ${paymentError.message}`)
    }

    // 4. 注文データ保存（決済成功後のみ）
    orderData = {
      order_number: `ORD${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      product_id: props.order.product_id,
      product_name: props.order.product_name,
      product_image: props.order.product_image,
      price: Number(props.order.price),
      quantity: 1,
      customer_name: props.order.customer_name,
      email: props.order.email,
      phone: props.order.phone,
      address: `〒${formattedZipCode}\n${props.order.address}`,
      payment_method: 'square',
      status: 'paid',
      customer_id: getOrCreateCustomerId() // 追加
    }

    // zip_codeカラムが存在する場合は別途設定
    try {
      const { error: schemaError } = await supabase
        .from('orders')
        .select('zip_code')
        .limit(1)
      if (!schemaError) {
        orderData.zip_code = formattedZipCode
        orderData.address = props.order.address
      }
    } catch (e) {}

    // 既存のpaid注文が既に存在しないかチェック（決済後に再度チェック）
    // const { data: paidOrder, error: paidFindError } = await supabase
    //   .from('orders')
    //   .select('*')
    //   .eq('customer_id', orderData.customer_id)
    //   .eq('product_id', orderData.product_id)
    //   .eq('status', 'paid')
    //   .maybeSingle()
    // if (paidOrder && !paidFindError) {
    //   throw new Error('この商品はすでに決済済みです。ご注文履歴をご確認ください。')
    // }
    // paid注文があっても新規注文は常に作成できるように修正

    // pending注文があればupdate
    const { data: existingOrder, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', orderData.customer_id)
      .eq('product_id', orderData.product_id)
      .eq('status', 'pending')
      .maybeSingle()
    let newOrderData, orderError
    if (existingOrder && !findError) {
      // pending注文をpaidにupdate
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          ...orderData,
          status: 'paid',
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)
        .select()
        .single()
      newOrderData = updatedOrder
      orderError = updateError
    } else {
      // 新規insert
      const insertResult = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()
      newOrderData = insertResult.data
      orderError = insertResult.error
    }
    if (orderError) {
      console.error('注文保存エラー:', orderError)
      
      // 重複注文防止トリガーエラーの処理
      if (orderError.message?.includes('prevent_rapid_duplicate_orders') || 
          orderError.message?.includes('RAPID_DUPLICATE') ||
          orderError.code === 'P0001') {
        throw new Error('⚠️ 短時間での重複注文が検出されました\n\n同じ商品を連続でご注文いただく場合は、30秒ほどお待ちいただいてから再度お試しください。\n\n意図的に複数個購入される場合は、お時間をおいてからご注文をお願いいたします。')
      }
      
      // zip_codeカラム関連エラーの処理
      if (orderError.code === '42703' || orderError.message?.includes('zip_code')) {
        throw new Error('システムの更新中です。管理者にお問い合わせください。\n（郵便番号カラムの問題）')
      }
      
      throw new Error(`注文の保存に失敗しました: ${orderError.message}`)
    }

    if (!newOrderData) {
      throw new Error('注文データの取得に失敗しました')
    }
    orderData = newOrderData

    // 5. 注文ステータスを完了に更新
    const { error: statusUpdateError } = await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        payment_confirmed_at: new Date().toISOString()
      })
      .eq('id', orderData.id)

    if (statusUpdateError) {
      console.error('ステータス更新エラー:', statusUpdateError)
      throw new Error('注文ステータスの更新に失敗しました')
    }


    // 6. 決済完了後に在庫を減らす
    try {
      await decreaseProductStock(props.order.product_id, 1)
    } catch (stockError) {
      console.error('在庫減少エラー:', stockError)
      throw new Error('在庫の更新に失敗しました。管理者にご連絡ください。')
    }

    // 7. メール送信（購入者・管理者）
    try {
      await sendPaymentConfirmationEmail(orderData)
    } catch (mailError) {
      console.error('メール送信エラー:', mailError)
      // メール送信失敗でも注文自体は完了させる
    }

    // 8. 成功メッセージ表示とリダイレクト
    alert(
      `✅ ご注文が完了しました！\n\n` +
      `注文番号: ${orderData.id}\n` +
      `決済ID: ${paymentResult.paymentId}\n` +
      `カード: ****${paymentResult.cardLast4} (${paymentResult.cardBrand})\n\n` +
      `※ これはテスト環境での決済です\n` +
      `注文履歴ページに移動します。\n` +
      `ご注文いただき、ありがとうございました。`
    )
    
    try {
      await router.push({
        name: 'my-orders'
      })
    } catch (routeError) {
      console.error('ナビゲーションエラー:', routeError)
      // フォールバック: パスを直接指定
      await router.push('/my-orders')
    }

  } catch (err) {
    console.error('決済処理中にエラーが発生しました:', err)
    
    // エラー時のクリーンアップと在庫復元
    if (orderData && orderData.id && !err.message.includes('決済処理中に在庫が不足')) {
      try {
        await supabase
          .from('orders')
          .delete()
          .eq('id', orderData.id)
      } catch (cleanupError) {
        console.error('クリーンアップエラー:', cleanupError)
      }
    }
    error.value = err.message || '決済処理中にエラーが発生しました。もう一度お試しください。'
  } finally {
    // フラグを必ずリセット
    isProcessing.value = false
    isPaymentInProgress = false
  }
}
</script>

<style scoped>
.square-payment-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

/* 購入確認画面 */
.purchase-confirmation {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.confirmation-content h2 {
  text-align: center;
  color: #2d5016;
  margin-bottom: 2rem;
  font-size: 1.8rem;
}

.payment-method-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.payment-method {
  color: #2d5016;
  font-weight: bold;
  font-size: 1.1rem;
  margin: 0.5rem 0;
}

.security-note {
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;
}

.confirmation-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

/* 決済画面 */
.payment-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.order-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.order-summary h3 {
  color: #2d5016;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.product-thumbnail {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.product-info h4 {
  color: #2d5016;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.price {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.4rem;
  margin: 0;
}

.customer-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.customer-info h3 {
  color: #2d5016;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.customer-info dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.8rem;
  margin: 0;
}

.customer-info dt {
  color: #666;
  font-weight: normal;
}

.customer-info dd {
  margin: 0;
  font-weight: 600;
  color: #333;
}

.payment-form {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.payment-form h3 {
  color: #2d5016;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.card-form {
  margin: 1.5rem 0;
  min-height: 150px;
  position: relative;
}

.card-form.loading-state {
  opacity: 0.3;
  pointer-events: none;
}

.payment-status {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
  font-weight: bold;
}

.payment-notice {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
  border: 1px solid #e9ecef;
}

.test-cards-info {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.test-cards-info p {
  margin: 0.5rem 0;
  color: #1976d2;
}

.test-cards-info strong {
  color: #0d47a1;
}

.test-cards-info ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.test-cards-info li {
  margin: 0.3rem 0;
  color: #333;
}

.test-note {
  font-size: 0.85rem;
  font-style: italic;
  color: #666 !important;
  margin-top: 0.5rem;
}

.error-message {
  background: #dc3545;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.primary-button,
.secondary-button,
.tertiary-button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  min-width: 200px;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.primary-button {
  background: #4CAF50;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: #388E3C;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.secondary-button {
  background: #6c757d;
  color: white;
}

.secondary-button:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

.tertiary-button {
  background: #ffc107;
  color: #333;
}

.tertiary-button:hover:not(:disabled) {
  background: #e0a800;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 193, 7, 0.3);
}

.primary-button:disabled,
.secondary-button:disabled,
.tertiary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 1.1rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  z-index: 10;
  min-width: 200px;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .square-payment-form {
    padding: 1rem;
  }
  
  .confirmation-content h2 {
    font-size: 1.5rem;
  }
  
  .product-info {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .customer-info dl {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .customer-info dt {
    font-weight: bold;
    color: #2d5016;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .primary-button,
  .secondary-button,
  .tertiary-button {
    width: 100%;
    max-width: 300px;
  }
}

/* Square SDKの郵便番号フィールドをカスタマイズ - 完全非表示を試行 */
::v-deep(.sq-postal-code),
::v-deep([data-testid="postal-code"]),
::v-deep([placeholder*="postal" i]),
::v-deep([placeholder*="zip" i]) {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -9999px !important;
}

/* もし上記で非表示にならない場合の代替スタイル */
::v-deep(.sq-postal-code input),
::v-deep([data-testid="postal-code"] input),
::v-deep([placeholder*="postal" i]),
::v-deep([placeholder*="zip" i]) {
  background-color: #f8f9fa !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
  border: 1px solid #dee2e6 !important;
}

/* 郵便番号フィールドの前にラベルを追加（非表示になった場合は表示されない） */
::v-deep(.sq-postal-code):before,
::v-deep([data-testid="postal-code"]):before {
  content: "郵便番号（前画面で入力済み）";
  display: block;
  font-size: 14px;
  color: #495057;
  margin-bottom: 5px;
  font-weight: 500;
}

/* Square SDKのコンテナレイアウトを調整 */
::v-deep(.sq-form) {
  display: flex !important;
  flex-direction: column !important;
  gap: 15px !important;
}

::v-deep(.sq-form-row) {
  display: flex !important;
  gap: 10px !important;
}

/* カード情報フィールドの日本語ラベル追加 */
#card-container {
  position: relative;
}
</style>
