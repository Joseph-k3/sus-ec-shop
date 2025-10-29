<template>
  <section class="faq-container">
    <h1 class="faq-title">よくあるご質問（FAQ）</h1>
    <router-link to="/" class="faq-home-link">
      <svg class="faq-home-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V9h6v12"/></svg>
      <span>トップ（商品一覧）へ戻る</span>
    </router-link>
    <div class="faq-list">
      <div class="faq-item" v-for="(faq, i) in faqs" :key="i">
        <button class="faq-question" @click="toggle(i)">
          <span>{{ faq.question }}</span>
          <span class="arrow" :class="{ open: openIndex === i }">▼</span>
        </button>
        <div v-if="openIndex === i" class="faq-answer">
          <slot :name="'answer-' + i">
            {{ faq.answer }}
          </slot>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

// ここに質問と回答を追加してください
const faqs = ref([
  {
    question: 'どのような支払い方法がありますか？',
    answer: '銀行振込、またはSquare請求書によるクレジットカード払いがご利用いただけます。'
  },
  {
    question: '配送方法と送料について教えてください。',
    answer: '配送はクロネコヤマトでお届けします。送料は一律1,000円、北海道・沖縄は1,800円です。お振り込み確認後、3日程度で発送いたします。'
  },
  {
    question: '梱包資材はどのようなものを使っていますか？',
    answer: '梱包資材は再利用品を用いることがあります。環境配慮のためご理解ください。'
  },
  {
    question: '配送時の植物のダメージは補償されますか？',
    answer: '配送時の葉折れ、枯れ、寒冷地配送による株ダメージ等への補償はございません。ご了承の上ご注文ください。'
  },
  {
    question: '虫が付着していることはありますか？',
    answer: '屋外で育成した株のため、虫等が付着している可能性が0ではありません。ご容赦ください。'
  },
  {
    question: 'ネームタグは付属しますか？',
    answer: '1品種につき1つタグをお付けします。オリジナルタグ、手書きタグ、ナーセリータグなどがあります。'
  },
  {
    question: '購入後にお願いしたいことはありますか？',
    answer: '到着後、時々で良いので株の成長をインスタグラムにアップしていただけると嬉しいです！'
  }
])

const openIndex = ref(null)
const toggle = (i) => {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<style scoped>
.faq-container {
  max-width: 700px;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  color: #222; /* 追加: 全体の文字色を濃く */
}
.faq-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 24px;
  text-align: center;
  color: #222; /* 追加: タイトルの文字色を濃く */
}
.faq-home-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  font-size: 1rem;
  color: #2e7d32;
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 18px;
  background: #e8f5e9;
  padding: 6px 16px;
  border-radius: 20px;
  transition: background 0.2s, color 0.2s;
}
.faq-home-link:hover {
  background: #c8e6c9;
  color: #1b5e20;
}
.faq-home-icon {
  width: 20px;
  height: 20px;
  stroke: #2e7d32;
  margin-right: 2px;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.faq-item {
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
}
.faq-question {
  width: 100%;
  background: none;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  transition: color 0.2s;
  color: #222; /* 追加: 質問の文字色を濃く */
}
.faq-question:hover {
  color: #2e7d32;
}
.arrow {
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(180deg);
}
.faq-answer {
  margin-top: 8px;
  color: #444;
  font-size: 1rem;
  line-height: 1.7;
  background: #f7f7f7; /* 追加: 回答部分の背景色を淡く */
  border-radius: 6px;
  padding: 12px;
}

@media (max-width: 768px) {
  .faq-container {
    padding: 10px 2vw;
    margin: 16px 0 0 0;
    max-width: 100vw;
    border-radius: 0;
    box-shadow: none;
  }
  .faq-title {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }
  .faq-home-link {
    font-size: 0.95rem;
    padding: 5px 10px;
    margin-bottom: 12px;
  }
  .faq-list {
    gap: 10px;
  }
  .faq-item {
    padding-bottom: 8px;
  }
  .faq-question {
    font-size: 1rem;
    padding: 6px 0;
  }
  .faq-answer {
    font-size: 0.95rem;
    padding: 10px;
  }
}
@media (max-width: 480px) {
  .faq-container {
    padding: 4px 1vw;
    margin: 8px 0 0 0;
  }
  .faq-title {
    font-size: 1.1rem;
    margin-bottom: 10px;
  }
  .faq-home-link {
    font-size: 0.9rem;
    padding: 4px 6px;
    margin-bottom: 8px;
  }
  .faq-list {
    gap: 6px;
  }
  .faq-question {
    font-size: 0.95rem;
    padding: 4px 0;
  }
  .faq-answer {
    font-size: 0.9rem;
    padding: 7px;
  }
}
</style>
