<template>
  <!-- スプラッシュスクリーン - bodyに直接挿入 -->
  <Teleport to="body">
    <div v-if="showSplash" class="splash-screen">
      <img src="/logo.jpg" alt="Logo" class="splash-logo" />
    </div>
  </Teleport>
  
  <!-- メインコンテンツ -->
  <div v-if="!showSplash && showContent" class="coming-soon fade-in">
    <h1>Coming Soon...</h1>
    <p class="message">販売開始日までお待ちください🙇</p>
    <div class="period" v-if="siteSettings">
      <p>販売期間：</p>
      <p>{{ formatDateTime(siteSettings.publish_start) }} 〜 {{ formatDateTime(siteSettings.publish_end) }}</p>
    </div>
    
    <!-- インスタグラムリンク -->
    <div class="seller-info">
      <p class="seller-text">出品者情報はこちらをチェック</p>
      <a 
        href="https://www.instagram.com/ryo_suke_071210/" 
        target="_blank" 
        rel="noopener noreferrer"
        class="instagram-link"
      >
        <svg class="instagram-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        <span>Instagram</span>
      </a>
    </div>
    
    <!-- 管理者画面へのリンク（右端固定） -->
    <button @click="showLogin = true" class="admin-link" title="管理者ログイン">
      <svg class="admin-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
      </svg>
    </button>
    
    <!-- ログインモーダル -->
    <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <div class="modal-content" @click.stop>
        <LoginForm @login-success="handleLoginSuccess" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from './LoginForm.vue'

const router = useRouter()

const props = defineProps({
  siteSettings: Object
})

const showLogin = ref(false)
const showSplash = ref(true)
const showContent = ref(false)

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

onMounted(() => {
  // スプラッシュ表示時の背景色を統一と#app要素を非表示
  document.body.style.backgroundColor = '#f5f5f5'
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.style.visibility = 'hidden'
  }
  
  // スプラッシュアニメーション開始
  setTimeout(() => {
    showSplash.value = false
    // スタイルを復元
    document.body.style.backgroundColor = ''
    if (appElement) {
      appElement.style.visibility = 'visible'
    }
    // スプラッシュが完全に消えてからコンテンツを表示（間隔をなくす）
    setTimeout(() => {
      showContent.value = true
    }, 50) // 50msの短い遅延でよりスムーズに
  }, 2000) // 2秒間スプラッシュ表示
})

const handleLoginSuccess = () => {
  showLogin.value = false
  // ログイン成功後にスプラッシュを表示するフラグを設定
  sessionStorage.setItem('show-splash-after-login', 'true')
  // ホームページに遷移（管理者として）
  router.push('/')
}
</script>

<style scoped>
/* スプラッシュスクリーン - CSS Grid による完全な中央配置 */
.splash-screen {
  /* 完全な画面占有 */
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  
  /* 背景とz-index */
  background-color: #f5f5f5 !important;
  z-index: 999999 !important;
  
  /* レイアウトリセット */
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  
  /* CSS Grid による中央配置 */
  display: grid !important;
  place-items: center !important;
  place-content: center !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 1fr !important;
  justify-items: center !important;
  align-items: center !important;
  justify-content: center !important;
  align-content: center !important;
  
  /* アニメーションと制約 */
  animation: fadeOut 0.8s ease-in-out 1.5s forwards;
  overflow: hidden !important;
  transform: none !important;
  
  /* 完全なリセット */
  inset: 0 !important;
  float: none !important;
  clear: both !important;
  contain: layout style paint !important;
  text-align: center !important;
}

.splash-logo {
  /* サイズ設定 */
  width: 75vmin !important;
  height: 75vmin !important;
  max-width: 400px !important;
  max-height: 400px !important;
  min-width: 200px !important;
  min-height: 200px !important;
  
  /* 画像表示 */
  object-fit: cover !important;
  border-radius: 50% !important;
  
  /* レイアウト */
  display: block !important;
  margin: 0 auto !important;
  position: relative !important;
  
  /* Grid子要素としての中央配置 */
  justify-self: center !important;
  align-self: center !important;
  place-self: center !important;
  
  /* アニメーション */
  animation: logoAnimation 2s ease-in-out;
  
  /* 完全なリセット */
  border: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  float: none !important;
  clear: both !important;
  vertical-align: middle !important;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes logoAnimation {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* メインコンテンツ */
.coming-soon {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: #f5f5f5;
  padding: 2rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 1s ease-out;
}

.coming-soon.fade-in {
  opacity: 1;
  transform: translateY(0);
}

h1 {
  font-size: 3rem;
  color: #2e7d32;
  margin-bottom: 1rem;
}

.message {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.period {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.period p {
  margin: 0.5rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

/* インスタグラムリンクセクション */
.seller-info {
  margin-top: 3rem;
  text-align: center;
}

.seller-text {
  color: #2c3e50;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.instagram-link {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.instagram-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.instagram-icon {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .splash-logo {
    width: 80vmin;
    height: 80vmin;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .message {
    font-size: 1.2rem;
  }
  
  .period {
    padding: 1rem;
  }
  
  .seller-info {
    margin-top: 2rem;
  }
  
  .seller-text {
    font-size: 1rem;
  }
  
  .instagram-link {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    gap: 0.5rem;
  }
  
  .instagram-icon {
    width: 20px;
    height: 20px;
  }
}

/* 管理者リンクボタン（右端固定） */
.admin-link {
  position: fixed;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
  opacity: 0.8;
}

.admin-link:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.admin-icon {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .admin-link {
    width: 45px;
    height: 45px;
    right: 8px;
  }
  
  .admin-icon {
    width: 20px;
    height: 20px;
  }
}

/* ログインモーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
</style>
