<template>
  <SplashScreen v-if="!loading" />
  <div v-if="loading">
    <div class="loading">読み込み中...</div>
  </div>
  <div v-else>
    <template v-if="isWithinPublishPeriod || isAdmin">
      <Header />
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
        <button v-else-if="$route.name === 'ProductList'" @click="showLogin = true" class="login-button">管理者ログイン</button>

        <router-view></router-view>

        <!-- ログインモーダル -->
        <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
          <div class="modal-content" @click.stop>
            <LoginForm @login-success="showLogin = false" />
          </div>
        </div>
      </main>
    </template>
    <ComingSoon v-else :siteSettings="siteSettings" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from './components/Header.vue'
import ProductList from './components/ProductList.vue'
import AdminProductEdit from './components/AdminProductEdit.vue'
import LoginForm from './components/LoginForm.vue'
import ComingSoon from './components/ComingSoon.vue'
import SplashScreen from './components/SplashScreen.vue'
import { supabase, getCurrentUser } from './lib/supabase'

const router = useRouter()

const showAdmin = ref(false)
const isAdmin = ref(false)
const showLogin = ref(false)
const siteSettings = ref(null)
const loading = ref(true)

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

onMounted(async () => {
  checkAdmin()
  
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
  } finally {
    loading.value = false
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

@media (max-width: 768px) {
  .main-content {
    margin-top: 64px;
    padding: 1rem;
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
