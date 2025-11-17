<template>
  <!-- ログイン後のスプラッシュスクリーン -->
  <SplashScreen v-if="showSplashAfterLogin" @finished="handleSplashFinished" />
  
  <!-- 読み込み中 -->
  <div v-else-if="loading" class="loading">
    <div>読み込み中...</div>
  </div>
  
  <div v-else>
    <!-- 公開期間チェック -->
    <!-- 本番運用時: 公開期間内であればComingSoon.vueは表示されず、ProductList.vueで直接スプラッシュ→商品一覧を表示 -->
    <template v-if="isWithinPublishPeriod || isAdmin">
      <Header />
      <div class="app-content" :class="{ 'fade-in': showMainContent }">
        <main class="main-content">
          <router-view></router-view>

          <!-- ログインモーダル -->
          <div v-if="showLogin" class="modal-overlay" @click="showLogin = false" ref="loginModal">
            <div class="modal-content" @click.stop>
              <LoginForm @login-success="showLogin = false" />
            </div>
          </div>
        </main>
      </div>
      
      <!-- 管理者用右端固定ボタン -->
      <div class="admin-fixed-controls">
        <button @click="handleAdminButtonClick" class="admin-link" title="管理画面">
          <svg class="admin-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
          </svg>
        </button>
        <router-link to="/" custom v-slot="{ navigate }" v-if="$route.name === 'admin'">
          <button @click="navigate" class="admin-link" title="商品一覧に戻る">
            <svg class="admin-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </button>
        </router-link>
        <button @click="showLogoutMenu = !showLogoutMenu" class="admin-link logout-toggle" title="ログアウト" v-if="isAdmin">
          <svg class="admin-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H4v16h10v-2h2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10Z"/>
          </svg>
        </button>
        <!-- ログアウト確認ミニメニュー -->
        <div v-if="showLogoutMenu" class="logout-menu">
          <button @click="handleLogout" class="logout-confirm">ログアウト</button>
          <button @click="showLogoutMenu = false" class="logout-cancel">キャンセル</button>
        </div>
      </div>
    </template>
    <ComingSoon v-else :siteSettings="siteSettings" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Header from './components/Header.vue'
import ProductList from './components/ProductList.vue'
import AdminProductEdit from './components/AdminProductEdit.vue'
import LoginForm from './components/LoginForm.vue'
import ComingSoon from './components/ComingSoon.vue'
import SplashScreen from './components/SplashScreen.vue'
import { supabase, getCurrentUser } from './lib/supabase'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const { isAuthenticated } = useAuth()

const showAdmin = ref(false)
const isAdmin = ref(false)
const showLogin = ref(false)
const loginModal = ref(null)
const showLogoutMenu = ref(false)
const siteSettings = ref(null)
const loading = ref(true)
const showSplashAfterLogin = ref(false)
const showMainContent = ref(false)
const showInitialSplash = ref(false)

// 公開期間内かどうかをチェック
const isWithinPublishPeriod = computed(() => {
  if (!siteSettings.value) return false
  
  const now = new Date()
  const start = new Date(siteSettings.value.publish_start)
  const end = new Date(siteSettings.value.publish_end)
  
  return now >= start && now <= end
})

// 管理者かどうかチェック
const checkAdmin = async () => {
  const user = await getCurrentUser()
  isAdmin.value = !!user
}

// スプラッシュ完了時の処理
const handleSplashFinished = () => {
  showSplashAfterLogin.value = false
  
  // 少し遅延してからメインコンテンツを表示（優しいフェードイン効果）
  setTimeout(() => {
    showMainContent.value = true
  }, 200)
}

// ルートの変更を監視してスプラッシュ表示を制御
watch(() => route.path, (newPath, oldPath) => {
  // ログインページから他のページに遷移した時にスプラッシュをチェック
  if (oldPath === '/login' && newPath === '/' && sessionStorage.getItem('show-splash-after-login') === 'true') {
    showSplashAfterLogin.value = true
    showMainContent.value = false // メインコンテンツを一旦隠す
    sessionStorage.removeItem('show-splash-after-login')
  } else if (newPath !== '/login') {
    // ログインページ以外では、スプラッシュがない場合はメインコンテンツを表示
    if (!showSplashAfterLogin.value && !loading.value) {
      showMainContent.value = true
    }
  }
})

// ログインモーダル表示時のスクロール制御
watch(showLogin, (newVal) => {
  if (newVal) {
    // ログインモーダルが表示された時にスクロール
    nextTick(() => {
      if (loginModal.value) {
        loginModal.value.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        })
      }
    })
  }
})

onMounted(async () => {
  await checkAdmin()
  
  // 初回ロード時にもスプラッシュチェック
  await nextTick()
  if (route.path === '/' && sessionStorage.getItem('show-splash-after-login') === 'true') {
    showSplashAfterLogin.value = true
    sessionStorage.removeItem('show-splash-after-login')
  }
  
  // サイト設定を取得
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    siteSettings.value = data
  } catch (error) {
    console.error('サイト設定の取得に失敗しました:', error)
  }
  
  loading.value = false
  
  // スプラッシュが表示されない場合は、すぐにメインコンテンツを表示
  if (!showSplashAfterLogin.value) {
    showMainContent.value = true
  }
  
  // ログイン状態の変更を監視
  supabase.auth.onAuthStateChange((event, session) => {
    isAdmin.value = !!session?.user
    if (!session?.user) {
      showAdmin.value = false
    }
  })
})

// ログアウト処理
const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    isAdmin.value = false
    showLogoutMenu.value = false
    await router.push('/')
  } catch (error) {
    console.error('ログアウト中にエラーが発生しました:', error)
  }
  showAdmin.value = false
  showLogin.value = false
}

// 管理者用ボタン押下時の処理
const handleAdminButtonClick = () => {
  if (isAdmin.value) {
    router.push('/admin')
  } else {
    showLogin.value = true
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  max-width: 100%;
  touch-action: manipulation;
}

html, body {
  margin: 0;
  padding: 0;
  scroll-behavior: smooth;
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

body {
  overflow-x: hidden;
  background-image: url('/succulents.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.loading {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  color: #2c3e50;
}

.main-content {
  margin-top: 80px;
  max-width: 100%;
  margin-left: 0;
  margin-right: 0;
  padding: 0;
  position: relative;
  z-index: 1;
  background-color: transparent;
  border-radius: 0;
  box-shadow: none;
}

/* 管理者用右端固定ボタン */
.admin-fixed-controls {
  position: fixed;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.admin-link {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  border: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  opacity: 0.8;
  cursor: pointer;
}

.admin-link:hover {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.admin-link.logout-toggle {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.admin-icon {
  width: 24px;
  height: 24px;
}

.logout-menu {
  position: absolute;
  right: 60px;
  bottom: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.logout-confirm, .logout-cancel {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.logout-confirm {
  background: #e74c3c;
  color: white;
}

.logout-confirm:hover {
  background: #c0392b;
}

.logout-cancel {
  background: #f8f9fa;
  color: #6c757d;
}

.logout-cancel:hover {
  background: #e9ecef;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

button:hover {
  background-color: #388E3C;
}

button.logout {
  background-color: #dc3545;
}

button.logout:hover {
  background-color: #c82333;
}

.login-button {
  margin-left: auto;
  display: block;
  margin-bottom: 2rem;
}

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
}

.app-content {
  opacity: 0;
  transform: translateY(20px);
  transition: all 1s ease-out;
  position: relative;
  min-height: 100vh;
  background-color: rgba(255, 255, 255, 0.95);
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.app-content * {
  max-width: 100%;
  box-sizing: border-box;
  touch-action: manipulation;
}

.app-content.fade-in {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .main-content {
    margin-top: 0;
    padding: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    box-sizing: border-box;
  }

  .admin-fixed-controls {
    right: 8px;
    gap: 8px;
  }

  .admin-link {
    width: 45px;
    height: 45px;
  }
  
  .admin-icon {
    width: 20px;
    height: 20px;
  }

  .logout-menu {
    right: 50px;
  }
}
</style>
