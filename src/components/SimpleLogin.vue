<template>
  <div class="simple-login-container">
    <div class="login-box">
      <div class="logo">
        <img src="/logo.jpg" alt="SUS plants shop">
      </div>
      <h2>サイトアクセス認証</h2>
      <p class="description">テスト中のため、パスワードが必要です</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="password">パスワード</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="パスワードを入力してください"
            :disabled="loading"
          >
        </div>
        
        <button type="submit" :disabled="loading || !password">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>
        
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      
      <div class="footer">
        <p>SUS plants shop - テスト環境</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const password = ref('')
const loading = ref(false)
const error = ref('')

// 環境変数からパスワードを取得（フォールバックあり）
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'susplants2025'

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 簡単な遅延を追加（リアルっぽくするため）
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (password.value === SITE_PASSWORD) {
      // ログイン成功
      login()
      
      // スプラッシュ画面フラグを設定
      sessionStorage.setItem('show-splash-after-login', 'true')
      
      // 少し遅延してからホームページに遷移
      setTimeout(async () => {
        await router.push('/')
      }, 100)
    } else {
      error.value = 'パスワードが正しくありません'
      password.value = ''
    }
  } catch (e) {
    error.value = 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.simple-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-box {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo {
  margin-bottom: 1.5rem;
}

.logo img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

h2 {
  margin: 0 0 0.5rem;
  color: #333;
  font-size: 1.5rem;
}

.description {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.login-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}

button:hover:not(:disabled) {
  background: #5a67d8;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  text-align: center;
}

.footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.footer p {
  color: #999;
  font-size: 0.8rem;
  margin: 0;
}

/* スマホ対応 */
@media (max-width: 768px) {
  .simple-login-container {
    padding: 0.5rem;
  }
  
  .login-box {
    padding: 1.5rem;
  }
  
  .logo img {
    width: 60px;
    height: 60px;
  }
  
  h2 {
    font-size: 1.3rem;
  }
}
</style>
