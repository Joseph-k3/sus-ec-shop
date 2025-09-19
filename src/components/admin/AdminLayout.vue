<template>
  <div class="admin-layout">
    <header class="admin-header">
      <h1>管理画面</h1>
      <nav class="admin-nav">
        <router-link to="/admin/orders" class="nav-link">
          <i class="fas fa-shopping-cart"></i>
          注文管理
        </router-link>
        <router-link to="/admin/products" class="nav-link">
          <i class="fas fa-leaf"></i>
          商品管理
        </router-link>
        <router-link to="/" class="nav-link">
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
// レイアウトコンポーネントのロジックがあれば追加
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
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
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 3px solid #2c5f2d;
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
}

.nav-link:hover {
  background: #2c5f2d;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(44, 95, 45, 0.3);
}

.nav-link.router-link-active {
  background: #2c5f2d;
  color: white;
  box-shadow: 0 2px 8px rgba(44, 95, 45, 0.4);
  font-weight: bold;
}

.admin-content {
  padding: 2rem;
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .admin-nav {
    flex-direction: column;
  }

  .nav-link {
    width: 100%;
  }
}
</style>