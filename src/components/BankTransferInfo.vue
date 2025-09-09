<template>
  <div class="bank-transfer-info">
    <div class="order-summary">
      <h3>ご注文内容・お客様情報</h3>
      <div class="content-wrapper">
        <div class="product-info">
          <h4>商品情報</h4>
          <img :src="order.product_image" :alt="order.product_name" class="product-thumbnail">
          <p class="product-name">{{ order.product_name }}</p>
          <p class="product-price">¥{{ order.price.toLocaleString() }}</p>
        </div>

        <div class="customer-info">
          <h4>お客様情報</h4>
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
    </div>

    <div class="completion-info">
      <div class="completion-message">
        <h3>ご注文ありがとうございます</h3>
        <div class="order-details">
          <dl>
            <dt>注文番号</dt>
            <dd>{{ order.order_number }}</dd>
            <dt>商品名</dt>
            <dd>{{ order.product_name }}</dd>
            <dt>お支払い金額</dt>
            <dd>¥{{ order.price.toLocaleString() }}</dd>
          </dl>
        </div>
      </div>

      <div class="message-box">
        <p class="highlight">
          お振込先情報は {{ order.email }} 宛にメールでお送りしました。
        </p>
        <div class="email-note">
          <span class="icon">ℹ️</span>
          <span>メールが届かない場合は、迷惑メールフォルダもご確認ください。</span>
        </div>
      </div>

      <div class="actions">
        <button @click="goToOrders" class="primary-button">
          注文履歴を確認する
        </button>
        <button @click="backToHome" class="secondary-button">
          商品一覧に戻る
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  order: {
    type: Object,
    required: true,
    validator: (order) => {
      return (
        order.product_image &&
        order.product_name &&
        order.price &&
        order.customer_name &&
        order.phone &&
        order.email &&
        order.address
      )
    }
  }
})

const router = useRouter()

// 注文履歴ページへ遷移
const goToOrders = () => {
  router.push('/my-orders')
}

// 商品一覧に戻る
const backToHome = () => {
  router.push('/')
}
</script>

<style scoped>
.bank-transfer-info {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.order-summary {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

.product-info, .customer-info {
  color: #333; /* 暗めの色に設定 */
}

.product-thumbnail {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  margin: 1rem 0;
}

.product-name {
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0.5rem 0;
  color: #333;
}

.product-price {
  font-size: 1.1rem;
  color: #333;
}

h3, h4 {
  color: #333;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 2rem;
}

h4 {
  font-size: 1.2rem;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0.5rem;
}

.bank-info {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.bank-details {
  margin: 2rem auto;
  max-width: 500px;
}

.bank-details dl {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 1rem;
  align-items: center;
  color: #333;
}

.bank-details dt {
  font-weight: 700;
  color: #1a202c;
  text-align: center;
  padding: 0.5rem;
  background-color: #f7fafc;
  border-radius: 4px;
}

.bank-details dd {
  margin: 0;
  color: #333;
  padding: 0.5rem;
  font-size: 1.1rem;
}

.payment-due {
  color: #e53e3e !important;
  font-weight: bold;
}

.bank-details dt.payment-due {
  background-color: #fff5f5;
}

.message-box {
  background: #f7fafc;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}

.instruction {
  color: #333;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.highlight {
  color: #2b6cb0;
  font-weight: bold;
  margin: 1rem 0;
}

.email-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.primary-button, .secondary-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.primary-button {
  background-color: #4299e1;
  color: white;
  border: none;
}

.primary-button:hover {
  background-color: #3182ce;
}

.secondary-button {
  background-color: white;
  color: #4299e1;
  border: 1px solid #4299e1;
}

.secondary-button:hover {
  background-color: #f7fafc;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.completion-info {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  text-align: center;
}

.completion-message {
  margin-bottom: 2rem;
}

.completion-message h3 {
  color: #2b6cb0;
  font-size: 1.8rem;
  margin-bottom: 2rem;
}

.order-details {
  max-width: 400px;
  margin: 0 auto;
}

.order-details dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: center;
  text-align: left;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
}

.order-details dt {
  font-weight: bold;
  color: #4a5568;
  padding: 0.5rem;
}

.order-details dd {
  margin: 0;
  color: #1a202c;
  padding: 0.5rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }

  .bank-details {
    margin: 1.5rem auto;
  }
  
  .bank-details dl {
    grid-template-columns: 120px 1fr;
    gap: 0.75rem;
  }

  .bank-details dt {
    font-size: 0.9rem;
    padding: 0.4rem;
  }

  .bank-details dd {
    font-size: 1rem;
    padding: 0.4rem;
  }

  .actions {
    flex-direction: column;
  }

  .primary-button, .secondary-button {
    width: 100%;
  }
}
</style>
