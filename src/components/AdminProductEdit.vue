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
            <button 
              @click="startEdit(product)" 
              @click.stop
              class="btn-edit" 
              type="button"
            >
              編集
            </button>
            <button @click="deleteProduct(product.id)" class="btn-delete" type="button">削除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
 * Supabaseストレージ設定について:
 * 
 * 1. バケット作成: このコンポーネントは自動的に'succulents-images'バケットを作成しますが、
 *    手動でSupabase管理画面から作成することも可能です。
 * 
 * 2. RLS (Row Level Security) ポリシー設定:
 *    Supabase管理画面 > Storage > Policies で以下を設定:
 *    - 読み取り（SELECT）: public read access
 *    - 書き込み（INSERT）: 認証されたユーザーのみ
 *    - 更新（UPDATE）: 認証されたユーザーのみ
 *    - 削除（DELETE）: 認証されたユーザーのみ
 * 
 * 3. バケット設定:
 *    - Public bucket: true
 *    - File size limit: 10MB
 *    - Allowed mime types: image/jpeg, image/png, image/webp, image/gif
 */

import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '../lib/supabase'

const products = ref([])
const editingId = ref(null)
const uploadProgress = ref(0)
const showManualInput = ref(false)
const currentProduct = ref({
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  is_reserved: false,
  image: ''
})

// 商品一覧を取得
const loadProducts = async () => {
  const { data, error } = await supabase
    .from('succulents')
    .select('id, name, description, price, quantity, is_reserved, image')
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
    // データベースに存在するフィールドのみを抽出
    const productData = {
      name: currentProduct.value.name,
      description: currentProduct.value.description,
      price: currentProduct.value.price,
      quantity: currentProduct.value.quantity,
      is_reserved: currentProduct.value.is_reserved,
      image: currentProduct.value.image
    }

    if (editingId.value) {
      // 更新
      const { error } = await supabase
        .from('succulents')
        .update(productData)
        .eq('id', editingId.value)
      
      if (error) throw error
      alert('商品を更新しました')
    } else {
      // 新規追加
      const { error } = await supabase
        .from('succulents')
        .insert([productData])
      
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
  
  // nextTickを使用してDOMの更新を待つ
  nextTick(() => {
    // 各フィールドを個別に設定してリアクティブ更新を確実にする
    currentProduct.value.name = product.name || ''
    currentProduct.value.description = product.description || ''
    currentProduct.value.price = product.price || 0
    currentProduct.value.quantity = product.quantity || 1
    currentProduct.value.is_reserved = product.is_reserved || false
    currentProduct.value.image = product.image || ''
  })
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
    image: ''
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
// バケットが存在するかチェックし、存在しない場合の対処
const ensureBucketExists = async () => {
  try {
    // まず簡単なテストアップロードでバケットの存在と権限を確認
    const testBlob = new Blob(['test'], { type: 'text/plain' })
    const testPath = `test_${Date.now()}.txt`
    
    const { data: testUpload, error: testError } = await supabase.storage
      .from('succulents-images')
      .upload(testPath, testBlob, { upsert: true })
    
    // テストファイルをすぐに削除
    if (testUpload) {
      await supabase.storage
        .from('succulents-images')
        .remove([testPath])
    }
    
    // バケットが存在し、アップロード権限がある場合
    if (!testError) {
      return true
    }
    
    // バケットが存在しない場合のエラーチェック
    if (testError.message.includes('Bucket not found')) {
      console.warn('succulents-imagesバケットが存在しません')
      
      // 自動作成を試行（管理者権限が必要）
      try {
        const { data, error: createError } = await supabase.storage.createBucket('succulents-images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          fileSizeLimit: 10485760 // 10MB
        })
        
        if (createError) {
          throw createError
        }
        
        console.log('succulents-imagesバケットを作成しました')
        return true
      } catch (createError) {
        console.error('バケット自動作成に失敗:', createError)
        alert(`ストレージバケットが存在しません。\n\n以下の手順で手動で作成してください：\n1. Supabase管理画面にログイン\n2. Storage > Create Bucket\n3. バケット名: succulents-images\n4. Public: チェック\n5. File size limit: 10MB\n\n詳細は supabase_storage_setup.md を参照してください。`)
        return false
      }
    }
    
    // RLSポリシーエラーの場合
    if (testError.message.includes('Row Level Security') || testError.message.includes('policy')) {
      console.error('ストレージアクセス権限エラー:', testError)
      alert(`🚨 ストレージのアクセス権限がありません
      
📋 即座に解決する方法：
1. Supabase管理画面にログイン
2. Storage → succulents-images バケット
3. Settings タブ → Row Level Security を OFF
4. または Policies で "Allow all for development" を作成

💡 SQLエディターで実行（推奨）：
CREATE POLICY "Allow all for development" ON storage.objects
FOR ALL USING (bucket_id = 'succulents-images')
WITH CHECK (bucket_id = 'succulents-images');

詳細な手順は supabase_storage_setup.md を参照してください。`)
      return false
    }
    
    // その他のエラー
    console.error('予期しないストレージエラー:', testError)
    alert('ストレージの確認中にエラーが発生しました: ' + testError.message)
    return false
    
  } catch (error) {
    console.error('バケット確認中にエラー:', error)
    alert('ストレージの確認中にエラーが発生しました。ネットワーク接続を確認してください。')
    return false
  }
}

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
    
    // バケットの存在確認・作成
    const bucketReady = await ensureBucketExists()
    if (!bucketReady) {
      return
    }
    
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `product_${timestamp}_${randomString}.${fileExtension}`
    
    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('succulents-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Upload error:', error)
      let errorMessage = 'アップロードに失敗しました'
      
      if (error.message.includes('Bucket not found')) {
        errorMessage = 'ストレージバケットが見つかりません。管理者権限でバケットを作成してください。'
      } else if (error.message.includes('Row Level Security')) {
        errorMessage = 'ストレージのアクセス権限がありません。管理者に確認してください。'
      } else if (error.message.includes('size')) {
        errorMessage = 'ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。'
      } else {
        errorMessage += ': ' + error.message
      }
      
      alert(errorMessage)
      uploadProgress.value = 0
      return
    }
    
    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('succulents-images')
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
    let errorMessage = 'アップロードに失敗しました'
    
    if (error.message) {
      errorMessage += ': ' + error.message
    }
    
    alert(errorMessage)
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
onMounted(async () => {
  await loadProducts()
  // ストレージバケットの存在確認・作成
  await ensureBucketExists()
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

@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
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
  background: #f8f9fa;
}

.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f8f9fa;
  transition: object-fit 0.3s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.product-thumb:hover {
  object-fit: cover;
  border: 1px solid #007bff;
}

/* 画像のフォールバック表示 */
.product-thumb:not([src]), 
.product-thumb[src=""], 
.product-thumb[src="#"] {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
}

.product-thumb:not([src])::before, 
.product-thumb[src=""]::before, 
.product-thumb[src="#"]::before {
  content: "📷";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: #6c757d;
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

/* タブレット対応 */
@media (max-width: 992px) {
  .admin-panel {
    margin: 1.5rem;
    padding: 1.5rem;
  }
  
  .edit-form {
    padding: 1.5rem;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
  
  .product-image-container {
    height: 180px;
  }
}

/* モバイル対応 */
@media (max-width: 768px) {
  .admin-panel {
    margin: 1rem;
    padding: 1rem;
  }
  
  .admin-panel h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .admin-panel h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .edit-form {
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .form-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    text-align: left;
    font-size: 0.9rem;
  }
  
  .form-group.description-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .form-group.description-group textarea {
    width: 100%;
    min-height: 120px;
    height: auto;
    box-sizing: border-box;
  }
  
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group input[type="url"],
  .form-group textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem;
    font-size: 1rem;
  }
  
  .upload-options {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .file-upload-btn {
    text-align: center;
    width: 100%;
    padding: 1rem;
  }
  
  .image-preview {
    max-width: 100%;
    margin: 0.75rem 0;
  }
  
  .image-preview img {
    height: 200px;
    object-fit: contain;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .product-item {
    padding: 1rem;
  }
  
  .product-image-container {
    height: 250px;
    margin-bottom: 0.75rem;
  }
  
  .product-thumb {
    object-fit: contain;
  }
  
  .product-details h4 {
    font-size: 1.1rem;
  }
  
  .product-details .price {
    font-size: 1.2rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    padding: 1rem;
  }
  
  .product-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn-edit,
  .btn-delete {
    width: 100%;
    padding: 0.75rem;
  }
  
  .quantity-group {
    flex-direction: column;
    align-items: start;
    gap: 0.75rem;
  }
  
  .quantity-group input[type="number"] {
    max-width: 100%;
    width: 100%;
  }
  
  .products-list {
    padding: 1rem;
  }
}

/* より小さなスマホ画面対応 */
@media (max-width: 480px) {
  .admin-panel {
    margin: 0.5rem;
    padding: 0.75rem;
  }
  
  .admin-panel h2 {
    font-size: 1.25rem;
  }
  
  .edit-form {
    padding: 0.75rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group input[type="url"],
  .form-group textarea {
    padding: 0.5rem;
    font-size: 0.95rem;
  }
  
  .form-group.description-group textarea {
    min-height: 100px;
    padding: 0.5rem;
  }
  
  .file-upload-btn {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .image-preview img {
    height: 180px;
  }
  
  .product-item {
    padding: 0.75rem;
  }
  
  .product-image-container {
    height: 200px;
  }
  
  .product-details h4 {
    font-size: 1rem;
  }
  
  .product-details .price {
    font-size: 1.1rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .btn-edit,
  .btn-delete {
    padding: 0.5rem;
    font-size: 0.85rem;
  }
  
  .products-list {
    padding: 0.75rem;
  }
  
  .form-row {
    gap: 1rem;
  }
}

</style>
