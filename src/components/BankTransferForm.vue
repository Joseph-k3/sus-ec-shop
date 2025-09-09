<template>
  <div class="bank-transfer-form">
    <div class="order-summary">
      <h3>ご注文内容</h3>
      <div class="product-info">
        <img :src="order.product_image" :alt="order.product_name" class="product-thumbnail">
        <div>
          <h4>{{ order.product_name }}</h4>
          <p class="price">¥{{ order.price.toLocaleString() }}</p>
        </div>
      </div>
      <div class="customer-info">
        <h3>お客様情報</h3>
        <dl>
          <dt>お名前</dt>
          <dd>{{ order.customer_name }}</dd>
          <dt>電話番号</dt>
          <dd>{{ order.phone }}</dd>
          <dt>メールアドレス</dt>
          <dd>{{ order.email }}</dd>
          <dt>住所</dt>
          <dd>{{ order.address }}</dd>
        </dl>
      </div>
    </div>

    <div class="bank-info">
      <h3>お振込先情報</h3>
      <div class="info-box">
        <dl>
          <dt>銀行名</dt>
          <dd>西日本シティ銀行</dd>
          <dt>支店名</dt>
          <dd>糸島支店（123）</dd>
          <dt>口座種類</dt>
          <dd>普通</dd>
          <dt>口座番号</dt>
          <dd>1756034</dd>
          <dt>口座名義</dt>
          <dd>納富亮典（ノウドミリョウスケ）</dd>
        </dl>
        <div class="important-notice">
          <h4>ご注意事項</h4>
          <ul>
            <li>お振込手数料はお客様負担となります。</li>
            <li>お支払い完了後、3日以内に商品を発送させていただきます。</li>
            <li>お振込は2日以内にお願いいたします。</li>
            <li>取引終了まで宜しくお願いいたします。</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="primary-button" @click="handleComplete">
        注文を確定する
      </button>
      <button class="secondary-button" @click="$router.push('/')">
        商品一覧に戻る
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const order = ref(route.params.orderData ? JSON.parse(route.params.orderData) : null)

const handleComplete = async () => {
  try {
    // 注文ステータスを更新
    const { error } = await supabase
      .from('orders')
      .update({ status: 'awaiting_payment' })
      .eq('id', order.value.id)

    if (error) throw error

    // 完了メッセージを表示
    alert('ご注文ありがとうございます。お振込をお待ちしております。')
    router.push('/')
  } catch (e) {
    console.error('Error updating order:', e)
    alert('エラーが発生しました。もう一度お試しください。')
  }
}
</script>

<style scoped>
.bank-transfer-form {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.bank-transfer-form h3,
.bank-transfer-form h4 {
  color: #000000 !important;
  margin-bottom: 1rem;
  font-weight: bold;
}

.order-summary,
.bank-info {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.product-info {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.product-thumbnail {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}

.price {
  font-size: 1.2rem;
  font-weight: bold;
  color: #000000;
}

.customer-info dl,
.bank-info dl {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 0.5rem 1rem;
  margin: 1rem 0;
}

dt {
  font-weight: bold;
  color: #000000;
}

dd {
  margin: 0;
  color: #000000;
}

.info-box {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 4px;
}

.important-notice {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.important-notice ul {
  padding-left: 1.5rem;
  color: #dc3545;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.primary-button,
.secondary-button {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.primary-button {
  background: #28a745;
  color: white;
}

.secondary-button {
  background: #6c757d;
  color: #ffffff !important;
  font-weight: normal;
}

.primary-button:hover,
.secondary-button:hover {
  opacity: 0.9;
}
</style>
