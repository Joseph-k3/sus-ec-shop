<template>
  <div class="login-form">
    <h2>管理者ログイン</h2>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input 
          id="email"
          v-model="email" 
          type="email" 
          required
          placeholder="管理者メールアドレス">
      </div>
      <div class="form-group">
        <label for="password">パスワード</label>
        <input 
          id="password"
          v-model="password" 
          type="password" 
          required
          placeholder="パスワード">
      </div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'ログイン中...' : 'ログイン' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const emit = defineEmits(['login-success'])
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (signInError) throw signInError
    
    // ログイン成功時、管理画面に遷移
    await router.push('/admin')
    // モーダルを閉じる場合は、親コンポーネントにイベントを発行
    emit('login-success')
    
  } catch (e) {
    error.value = 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
    console.error('Login error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h2 {
  margin: 0 0 1.5rem;
  text-align: center;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-top: 1rem;
  text-align: center;
}
</style>
