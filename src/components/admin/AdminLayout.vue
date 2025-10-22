<template>
  <div class="admin-layout">
    <header class="admin-header">
      <h1>管理画面</h1>
      <nav class="admin-nav">
        <router-link to="/admin/orders" class="nav-link" @click="handleNavClick">
          <i class="fas fa-shopping-cart"></i>
          注文管理
        </router-link>
        <router-link to="/admin/products" class="nav-link" @click="handleNavClick">
          <i class="fas fa-leaf"></i>
          商品管理
        </router-link>
        <router-link to="/" class="nav-link store-link" @click="handleNavClick">
          <i class="fas fa-store"></i>
          ストアへ戻る
        </router-link>
      </nav>
    </header>

    <main class="admin-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// ナビゲーションのクリックハンドラ
const handleNavClick = (event) => {
  // タッチデバイスでの確実な動作のため、明示的にナビゲーション
  const link = event.currentTarget
  const to = link.getAttribute('href')
  
  if (to && to !== router.currentRoute.value.path) {
    event.preventDefault()
    router.push(to)
  }
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
  width: 100vw;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.admin-layout * {
  max-width: 100%;
  box-sizing: border-box;
}

.admin-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/succulents.JPEG') center/cover;
  opacity: 0.05;
  z-index: -1;
}

.admin-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 3px solid #2c5f2d;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.admin-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  color: #2c3e50;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.admin-nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  color: #495057;
  border-radius: 8px;
  transition: all 0.3s;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #dee2e6;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.nav-link:hover {
  background: #2c5f2d;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(44, 95, 45, 0.3);
}

.nav-link:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(44, 95, 45, 0.2);
}

.nav-link.router-link-active {
  background: #2c5f2d;
  color: white;
  box-shadow: 0 2px 8px rgba(44, 95, 45, 0.4);
  font-weight: bold;
}

.admin-content {
  padding: 2rem 2rem 2rem 2rem;
  padding-top: 1.5rem; /* PCでヘッダーがstickyなので、適切な余白を追加 */
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  margin: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

@media (min-width: 769px) and (max-width: 1600px) {
  .admin-content {
    padding: 2rem 1rem;
  }
}

@media (max-width: 768px) {
  .admin-layout {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
  }
  
  .admin-header {
    padding: 1rem 0.5rem !important;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    min-height: 180px; /* スマホでのヘッダー最小高さを保証 */
  }

  .admin-header h1 {
    font-size: 1.5rem;
    margin: 0 0 0.75rem 0;
  }

  .admin-nav {
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    padding-bottom: 0.5rem; /* ナビゲーション下部に余白追加 */
  }

  .nav-link {
    width: 100%;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    padding: 1rem 1.5rem;
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(44, 95, 45, 0.3);
    box-sizing: border-box;
  }
  
  .nav-link:active {
    background: #2c5f2d !important;
    color: white !important;
    transform: scale(0.98);
  }
  
  /* ストアへ戻るボタンを強調 */
  .nav-link.store-link {
    background: rgba(44, 95, 45, 0.1);
    border-color: #2c5f2d;
    font-weight: 600;
  }
  
  .admin-content {
    padding: 1rem 0.5rem 0.5rem 0.5rem !important;
    padding-top: 4rem !important; /* メインヘッダー(80px)+Adminヘッダー(180px)を考慮 */
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
}

@media (max-width: 480px) {
  .admin-header {
    padding: 0.75rem;
  }

  .admin-header h1 {
    font-size: 1.25rem;
  }

  .admin-nav {
    gap: 0.5rem;
  }

  .nav-link {
    padding: 0.9rem 1rem;
    font-size: 0.95rem;
  }

  .admin-content {
    padding: 1rem 0.5rem 0.5rem 0.5rem !important;
    padding-top: 4.5rem !important; /* メインヘッダー+Adminヘッダーを考慮し、小さなスマホで十分な余白確保 */
    width: 100vw !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
}
</style>