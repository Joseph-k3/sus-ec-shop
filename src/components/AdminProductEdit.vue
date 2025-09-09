<template>
  <div class="admin-panel">
    <h2>商品管理画面</h2>

    <!-- 商品追加・編集フォーム -->
    <form @submit.prevent="handleSubmit" class="edit-form">
      <h3>{{ editingId ? '商品を編集' : '新規商品を追加' }}</h3>
      
      <div class="form-group">
        <label for="name">商品名 <span class="required">*</span></label>
        <input 
          id="name"
          v-model="currentProduct.name"
          type="text"
          required
          placeholder="例：エケベリア ラウリンゼ"
        >
      </div>

      <div class="form-group">
        <label for="price">価格 <span class="required">*</span></label>
        <input
          id="price"
          v-model.number="currentProduct.price"
          type="number"
          min="0"
          required
          placeholder="例：2000"
        >
      </div>

      <div class="form-group description-group">
        <label for="description">商品説明 <span class="required">*</span></label>
        <textarea
          id="description"
          v-model="currentProduct.description"
          rows="3"
          required
          placeholder="商品の特徴や育て方のポイントなど"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="quantity">在庫数 <span class="required">*</span></label>
        <div class="quantity-group">
          <input
            id="quantity"
            v-model.number="currentProduct.quantity"
            type="number"
            min="0"
            required
            placeholder="例：1"
          >
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="currentProduct.is_reserved"
            >
            取引中にする
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="image">画像URL <span class="required">*</span></label>
        <div class="image-input-group">
          <input
            id="image"
            v-model="currentProduct.image"
            type="url"
            required
            placeholder="https://example.com/image.jpg"
          >
          <div class="image-preview" v-if="currentProduct.image">
            <img :src="currentProduct.image" alt="プレビュー">
          </div>
        </div>
      </div>



      <div class="form-actions">
        <button type="submit" class="btn-primary">
          {{ editingId ? '更新' : '追加' }}
        </button>
        <button 
          type="button" 
          class="btn-secondary" 
          v-if="editingId"
          @click="cancelEdit"
        >
          キャンセル
        </button>
      </div>
    </form>

    <!-- 商品一覧 -->
    <div class="products-list">
      <h3>商品一覧</h3>
      <div class="product-grid">
        <div v-for="product in products" :key="product.id" class="product-item">
          <div class="product-image-container">
            <img :src="product.image" :alt="product.name" class="product-thumb">
            <div v-if="product.is_reserved" class="status-badge reserved">取引中</div>
            <div v-else-if="product.quantity <= 0" class="status-badge sold-out">売約済み</div>
          </div>
          <div class="product-details">
            <h4>{{ product.name }}</h4>
            <p class="price">¥{{ product.price.toLocaleString() }}</p>
            <p class="stock-info" :class="{ 'low-stock': product.quantity <= 1 }">
              残り{{ product.quantity }}点
            </p>
          </div>
          <div class="product-actions">
            <button @click="startEdit(product)" class="btn-edit">編集</button>
            <button @click="deleteProduct(product.id)" class="btn-delete">削除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const products = ref([])
const editingId = ref(null)
const currentProduct = ref({
  name: '',
  description: '',
  price: 0,
  image: '',
  instagram: ''
})

// 商品一覧を取得
const loadProducts = async () => {
  const { data, error } = await supabase
    .from('succulents')
    .select('*')
    .order('id', { ascending: true })
  
  if (error) {
    console.error('Error loading products:', error)
    return
  }
  
  products.value = data
}

// 商品を追加・更新
const handleSubmit = async () => {
  try {
    if (editingId.value) {
      // 更新
      const { error } = await supabase
        .from('succulents')
        .update(currentProduct.value)
        .eq('id', editingId.value)
      
      if (error) throw error
      alert('商品を更新しました')
    } else {
      // 新規追加
      const { error } = await supabase
        .from('succulents')
        .insert([currentProduct.value])
      
      if (error) throw error
      alert('商品を追加しました')
    }
    
    // フォームをリセット
    resetForm()
    // 商品一覧を再読み込み
    loadProducts()
  } catch (error) {
    console.error('Error saving product:', error)
    alert('エラーが発生しました')
  }
}

// 編集を開始
const startEdit = (product) => {
  editingId.value = product.id
  currentProduct.value = { ...product }
}

// 編集をキャンセル
const cancelEdit = () => {
  editingId.value = null
  resetForm()
}

// フォームをリセット
const resetForm = () => {
  editingId.value = null
  currentProduct.value = {
    name: '',
    description: '',
    price: 0,
    quantity: 1,
    is_reserved: false,
    image: '',
    instagram: ''
  }
}

// 商品を削除
const deleteProduct = async (id) => {
  if (!confirm('本当にこの商品を削除しますか？')) return
  
  try {
    const { error } = await supabase
      .from('succulents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    alert('商品を削除しました')
    loadProducts()
  } catch (error) {
    console.error('Error deleting product:', error)
    alert('削除中にエラーが発生しました')
  }
}

// 初期読み込み
onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.admin-panel {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
}

.admin-panel h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.admin-panel h3 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.edit-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  align-items: center;
}

.form-group label {
  color: #2c3e50;
  font-weight: bold;
  text-align: right;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="url"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group.description-group {
  grid-template-columns: 120px 1fr;
  align-items: start;
}

.form-group.description-group textarea {
  resize: vertical;
  min-height: 80px;
  height: 80px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin-top: 2rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  cursor: pointer;
}

.required {
  color: #dc3545;
  margin-left: 0.2rem;
}

.image-input-group {
  display: flex;
  gap: 1rem;
  align-items: start;
}

.image-input-group input {
  flex: 1;
}

.image-preview {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quantity-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-group input[type="number"] {
  width: 120px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.products-list {
  margin-top: 3rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.product-item {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.product-image-container {
  position: relative;
  width: 100%;
  padding-top: 100%;
}

.product-thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: bold;
  color: white;
}

.reserved {
  background: rgba(0, 0, 0, 0.7);
}

.sold-out {
  background: rgba(128, 128, 128, 0.8);
}

.product-details {
  padding: 1rem;
}

.product-details h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.price {
  font-size: 1.25rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0.5rem 0;
}

.stock-info {
  font-size: 0.875rem;
  color: #666;
  margin: 0.5rem 0;
}

.low-stock {
  color: #dc3545;
  font-weight: bold;
}

.product-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
}

.btn-edit,
.btn-delete {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-edit {
  background: #17a2b8;
  color: white;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-edit:hover,
.btn-delete:hover,
.btn-primary:hover,
.btn-secondary:hover {
  opacity: 0.9;
}
</style>
