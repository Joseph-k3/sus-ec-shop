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
  background: #f8f9fa;
}

.admin-header {
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.admin-header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #333;
}

.admin-nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f1f3f5;
  color: #333;
}

.nav-link.router-link-active {
  background: #e9ecef;
  color: #000;
  font-weight: bold;
}

.admin-content {
  padding: 2rem;
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