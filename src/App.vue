<template>
  <!-- ログイン後のスプラッシュスクリーン -->
  <SplashScreen v-if="showSplashAfterLogin" @finished="handleSplashFinished" />
  
  <!-- 読み込み中 -->
  <div v-else-if="loading" class="loading">
    <div>読み込み中...</div>
  </div>
  
  <div v-else>
    <!-- ログインページの場合は直接表示 -->
    <template v-if="$route.name === 'login'">
      <router-view></router-view>
    </template>
    <!-- その他のページの場合は公開期間チェック -->
    <template v-else-if="isWithinPublishPeriod || isAdmin">
      <Header />
      <div class="app-content" :class="{ 'fade-in': showMainContent }">
        <main class="main-content">
          <div class="admin-controls" v-if="isAdmin">
            <router-link to="/admin" custom v-slot="{ navigate }">
              <button @click="navigate">管理画面へ</button>
            </router-link>
            <router-link to="/" custom v-slot="{ navigate }">
              <button @click="navigate">商品一覧に戻る</button>
            </router-link>
            <button @click="handleLogout" class="logout">ログアウト</button>
          </div>
          <button v-else-if="$route.name === 'home'" @click="showLogin = true" class="login-button">管理者ログイン</button>

          <router-view></router-view>

          <!-- ログインモーダル -->
          <div v-if="showLogin" class="modal-overlay" @click="showLogin = false" ref="loginModal">
            <div class="modal-content" @click.stop>
              <LoginForm @login-success="showLogin = false" />
            </div>
          </div>
        </main>
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
    await router.push('/')
  } catch (error) {
    console.error('ログアウト中にエラーが発生しました:', error)
  }
  showAdmin.value = false
  showLogin.value = false
}
</script>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  scroll-behavior: smooth;
  position: relative;
  min-height: 100vh;
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
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem 2rem;
  position: relative;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.admin-controls {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 2rem;
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
}

.app-content.fade-in {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .main-content {
    margin-top: 70px; /* ヘッダー高さに合わせて調整 */
    padding: 1rem;
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }

  .admin-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  button {
    width: 100%;
  }
}
</style>
