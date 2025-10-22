<template>
  <header class="header">
    <div class="header-content">
      <div class="header-left">
        <router-link to="/" class="logo-image">
          <img src="/logo.jpg" alt="SUS Plants Logo" />
        </router-link>
      </div>
      <router-link to="/" class="logo-text"><span class="highlight">SUS</span> plants</router-link>
      <nav class="nav-links">
        <!-- 管理者でない場合：通常のナビゲーション -->
        <template v-if="!isAdmin">
          <a href="https://www.instagram.com/ryo_suke_071210/" target="_blank" class="nav-link seller-info">
            <span class="seller-text">出品者情報はこちら</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
        </template>
        
        <!-- 管理者の場合：管理者用ナビゲーション -->
        <template v-else>
          <router-link v-if="!isAdminRoute" to="/admin/orders" class="nav-link admin-nav-link">
            <i class="fas fa-cog"></i>
            <span class="admin-text">管理画面</span>
          </router-link>
          
          <template v-else>
            <!-- 管理画面内では簡素なナビゲーション（AdminLayout.vueでメイン管理） -->
            <router-link to="/" class="nav-link admin-nav-link store-link">
              <i class="fas fa-store"></i>
              <span class="admin-text">ストア</span>
            </router-link>
          </template>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const route = useRoute()
const { isAdmin } = useAuth()

// 管理画面かどうかを判定
const isAdminRoute = computed(() => {
  return route.path.startsWith('/admin')
})
</script>

<style scoped>
.header {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: 80px;
  z-index: 9999 !important;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 2rem;
  height: 100%;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-image {
  width: 60px;
  height: 60px;
  overflow: hidden;
  display: block;
  margin: -0.5rem 0;  /* ヘッダーの上下端にぴったり合わせる */
}

.logo-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-text {
  font-size: 2.0rem;
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  text-align: left;
  margin-left: 0px;
}

.logo-text .highlight {
  color: #2e7d32; /* 濃い緑色 */
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: #2c3e50;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #4CAF50;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.seller-text {
  font-size: 0.9rem;
}

.seller-info svg {
  transition: transform 0.2s;
  flex-shrink: 0;
}

.seller-info:hover svg {
  transform: scale(1.1);
}



/* タブレット用のスタイル */
@media (max-width: 1024px) {
  .header-content {
    padding: 1rem 1.5rem;
    gap: 1.5rem;
  }
  
  .logo-text {
    font-size: 1.8rem;
    margin-left: -60px;
  }
}

/* スマートフォン用のスタイル */
@media (max-width: 768px) {
  .header {
    height: 70px;
  }
  
  .header-content {
    grid-template-columns: auto auto 1fr;
    gap: 0.8rem;
    padding: 0.5rem 1rem;
  }

  .logo-image {
    width: 40px;
    height: 40px;
  }

  .logo-text {
    display: flex;
    font-size: 1.4rem;
    margin-left: 0;
    white-space: nowrap;
  }

  .nav-links {
    gap: 0.5rem;
    font-size: 0.8rem;
    justify-self: end;
  }

  .seller-info {
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .seller-text {
    font-size: 0.7rem;
  }
}

/* 非常に小さなスマートフォン用 */
@media (max-width: 480px) {
  .header-content {
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
  }

  .logo-image {
    width: 35px;
    height: 35px;
  }

  .logo-text {
    font-size: 1.2rem;
  }

  .nav-links {
    flex-direction: column;
    gap: 0.3rem;
    align-items: flex-end;
  }

  .seller-text {
    display: none;
  }
}

/* 管理者用ナビゲーションスタイル */
.admin-nav-link {
  background: rgba(44, 95, 45, 0.1) !important;
  color: #2c5f2d !important;
  border: 1px solid rgba(44, 95, 45, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.admin-nav-link:hover {
  background: #2c5f2d !important;
  color: white !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(44, 95, 45, 0.3);
}

.admin-nav-link.active {
  background: #2c5f2d !important;
  color: white !important;
  font-weight: 600;
}

.admin-nav-link.store-link {
  background: rgba(44, 95, 45, 0.8) !important;
  color: white !important;
}

.admin-text {
  font-size: 0.9rem;
  margin-left: 0.3rem;
}

@media (max-width: 768px) {
  .admin-nav-link {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .admin-text {
    font-size: 0.8rem;
    margin-left: 0.2rem;
  }
}

@media (max-width: 480px) {
  .admin-text {
    display: none;
  }
  
  .admin-nav-link {
    padding: 0.4rem;
    min-width: 40px;
    justify-content: center;
  }
}
</style>
