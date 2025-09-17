import { ref, computed } from 'vue'

// サイト認証の状態管理
const isAuthenticated = ref(false)
const authChecked = ref(false)

// 認証の有効期限（24時間）
const AUTH_EXPIRY_HOURS = 24

export function useAuth() {
  // 認証状態をチェック
  const checkAuth = () => {
    const authFlag = localStorage.getItem('site-authenticated')
    const authTime = localStorage.getItem('site-auth-time')
    
    if (authFlag === 'true' && authTime) {
      const loginTime = parseInt(authTime)
      const now = Date.now()
      const hoursPassed = (now - loginTime) / (1000 * 60 * 60)
      
      if (hoursPassed < AUTH_EXPIRY_HOURS) {
        isAuthenticated.value = true
      } else {
        // 期限切れの場合はクリア
        clearAuth()
      }
    }
    
    authChecked.value = true
  }
  
  // ログイン成功時の処理
  const login = () => {
    localStorage.setItem('site-authenticated', 'true')
    localStorage.setItem('site-auth-time', Date.now().toString())
    isAuthenticated.value = true
  }
  
  // ログアウト処理
  const logout = () => {
    clearAuth()
  }
  
  // 認証情報をクリア
  const clearAuth = () => {
    localStorage.removeItem('site-authenticated')
    localStorage.removeItem('site-auth-time')
    isAuthenticated.value = false
  }
  
  // 初期化時に認証状態をチェック
  if (!authChecked.value) {
    checkAuth()
  }
  
  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    authChecked: computed(() => authChecked.value),
    login,
    logout,
    checkAuth
  }
}
