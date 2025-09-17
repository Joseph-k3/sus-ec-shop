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
        <a href="https://www.instagram.com/ryo_suke_071210/" target="_blank" class="nav-link seller-info">
          <span class="seller-text">出品者情報はこちら</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
        <button @click="handleSiteLogout" class="site-logout-button">
          サイトからログアウト
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { logout } = useAuth()

const handleSiteLogout = async () => {
  logout()
  await router.push('/login')
}
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

.site-logout-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.site-logout-button:hover {
  background: #c82333;
}

.site-logout-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.site-logout-button:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .header-content {
    grid-template-columns: auto 1fr;
    gap: 1rem;
    padding: 0.5rem 1rem;
  }

  .logo-text {
    display: none;
  }

  .nav-links {
    gap: 1rem;
    font-size: 0.9rem;
  }

  .logo-image {
    width: 32px;
    height: 32px;
  }

  .seller-text {
    display: none;
  }

  .site-logout-button {
    font-size: 0.7rem;
    padding: 0.3rem 0.5rem;
  }
}
</style>
