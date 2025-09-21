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
        <label for="image">商品画像</label>
        <div class="image-upload-section">
          <!-- ファイル選択 -->
          <div class="upload-options">
            <label for="imageFile" class="file-upload-btn">
              📷 画像を選択
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                @change="handleImageSelect"
                style="display: none;"
              >
            </label>
            <span class="upload-info">JPG, PNG, WebP対応</span>
          </div>
          
          <!-- アップロード進捗 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}% アップロード中...</span>
          </div>
          
          <!-- 手動URL入力（オプション） -->
          <div class="manual-url-section">
            <label class="toggle-manual" @click="showManualInput = !showManualInput">
              🔗 手動でURLを入力
            </label>
            <div v-if="showManualInput" class="manual-input">
              <input
                v-model="currentProduct.image"
                type="url"
                placeholder="https://example.com/image.jpg"
              >
            </div>
          </div>
          
          <!-- 画像プレビュー -->
          <div class="image-preview" v-if="currentProduct.image">
            <img :src="currentProduct.image" alt="プレビュー">
            <button type="button" class="remove-image" @click="removeImage">
              ❌ 削除
            </button>
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
const uploadProgress = ref(0)
const showManualInput = ref(false)
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

// 画像ファイル選択時の処理
const handleImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // ファイルサイズチェック（10MB以下）
  if (file.size > 10 * 1024 * 1024) {
    alert('ファイルサイズは10MB以下にしてください')
    return
  }
  
  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    alert('JPG、PNG、WebP、GIF形式のファイルのみ対応しています')
    return
  }
  
  try {
    uploadProgress.value = 0
    
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `product_${timestamp}_${randomString}.${fileExtension}`
    
    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('succulents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Upload error:', error)
      alert('アップロードに失敗しました: ' + error.message)
      return
    }
    
    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('succulents')
      .getPublicUrl(fileName)
    
    if (urlData?.publicUrl) {
      currentProduct.value.image = urlData.publicUrl
      uploadProgress.value = 100
      
      // 進捗表示を少し遅らせてから非表示にする
      setTimeout(() => {
        uploadProgress.value = 0
      }, 1500)
    }
    
  } catch (error) {
    console.error('Upload error:', error)
    alert('アップロードに失敗しました')
    uploadProgress.value = 0
  }
}

// 画像を削除
const removeImage = () => {
  if (confirm('画像を削除しますか？')) {
    currentProduct.value.image = ''
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.admin-panel h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 700;
}

.admin-panel h3 {
  text-align: center;
  color: #2c5f2d;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.edit-form {
  background: rgba(255, 255, 255, 0.98);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
  font-weight: 600;
  text-align: right;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="url"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.9);
  color: #495057;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2c5f2d;
  box-shadow: 0 0 0 2px rgba(44, 95, 45, 0.25);
  background: white;
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
  position: relative;
  max-width: 300px;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.remove-image {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.remove-image:hover {
  background: rgba(220, 53, 69, 1);
}

/* 画像アップロード関連のスタイル */
.image-upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-options {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-upload-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  text-align: center;
  user-select: none;
}

.file-upload-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.upload-info {
  color: #6c757d;
  font-size: 0.9rem;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #28a745);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.9rem;
  color: #495057;
  text-align: center;
}

.manual-url-section {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.toggle-manual {
  display: inline-block;
  color: #007bff;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  text-decoration: underline;
}

.toggle-manual:hover {
  color: #0056b3;
}

.manual-input {
  margin-top: 0.5rem;
}

.manual-input input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* 商品一覧のスタイル */
.products-list {
  background: rgba(255, 255, 255, 0.98);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 2rem;
}

.products-list h3 {
  text-align: center;
  color: #2c5f2d;
  margin-bottom: 2rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.product-item {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
}

.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #f8f9fa;
}

.status-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.status-badge.reserved {
  background: rgba(255, 193, 7, 0.9);
  color: #212529;
}

.status-badge.sold-out {
  background: rgba(108, 117, 125, 0.9);
}

.product-details {
  margin-bottom: 1.5rem;
}

.product-details h4 {
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.product-details .price {
  color: #2c5f2d;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.product-details .stock-info {
  color: #495057;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
}

.product-details .stock-info.low-stock {
  color: #dc3545;
  font-weight: 600;
}

.product-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
}

.btn-edit,
.btn-delete {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-1px);
}

/* フォームボタンのスタイル */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  min-width: 120px;
}

.btn-primary {
  background: #2c5f2d;
  color: white;
}

.btn-primary:hover {
  background: #1e4220;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(44, 95, 45, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

/* 数量グループのスタイル */
.quantity-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-group input[type="number"] {
  max-width: 120px;
}

.quantity-group .checkbox-label {
  color: #2c3e50;
  font-weight: 500;
  white-space: nowrap;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .admin-panel {
    margin: 1rem;
    padding: 1rem;
  }
  
  .form-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .form-group label {
    text-align: left;
  }
  
  .upload-options {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-upload-btn {
    text-align: center;
    width: 100%;
  }
  
  .image-preview {
    max-width: 100%;
  }
  
  .image-preview img {
    height: 250px;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
  
  .product-actions {
    flex-direction: column;
  }
  
  .quantity-group {
    flex-direction: column;
    align-items: start;
    gap: 0.5rem;
  }
}
</style>
