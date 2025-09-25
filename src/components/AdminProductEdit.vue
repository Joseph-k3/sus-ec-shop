<template>
  <div class="admin-panel">
    <h2>商品管理画面</h2>



    <!-- 商品追加・編集フォーム -->
    <form @submit.prevent="handleSubmit" class="edit-form" ref="editForm">
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
        <label for="description">商品説明</label>
        <textarea
          id="description"
          v-model="currentProduct.description"
          rows="3"
          placeholder="商品の特徴や育て方のポイントなど（任意）"
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
        <div class="multiple-image-upload-section">
          <!-- 複数ファイル選択 -->
          <div class="upload-options">
            <label for="imageFiles" class="file-upload-btn">
              📷 画像を追加（複数選択可）
              <input
                id="imageFiles"
                type="file"
                accept="image/*"
                multiple
                @change="handleMultipleImageSelect"
                style="display: none;"
              >
            </label>
            

            <span class="upload-info">JPG, PNG, WebP対応 | 複数選択可</span>
          </div>
          
          <!-- アップロード進捗 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}% アップロード中...</span>
          </div>
          
          <!-- 一時画像一覧（新規商品用） -->
          <div v-if="!editingId && tempImages.length > 0" class="images-gallery">
            <h4>選択した画像（商品保存時にアップロードされます）</h4>
            <div class="images-grid temp-images-grid">
              <div 
                v-for="(image, index) in tempImages" 
                :key="image.id"
                class="image-item temp-image-item"
                :class="{ 'primary': image.is_primary }"
              >
                <img :src="image.preview_url" :alt="image.alt_text || `画像 ${index + 1}`">
                <div class="image-controls">
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: image.is_primary }"
                    @click="setTempPrimaryImage(image.id)"
                    title="メイン画像に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="removeTempImage(image.id)"
                    title="画像を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="image-order">{{ index + 1 }}</div>
                <div v-if="image.is_primary" class="primary-badge">メイン</div>
                <div class="temp-badge">未保存</div>
              </div>
            </div>
          </div>

          <!-- 既存画像一覧 -->
          <div v-if="editingId && productImages.length > 0" class="images-gallery">
            <h4>登録済み画像（ドラッグ&ドロップで順序変更）</h4>
            <div 
              class="images-grid"
              @drop="handleDrop"
              @dragover.prevent
              @dragenter.prevent
            >
              <div 
                v-for="(image, index) in productImages" 
                :key="image.id"
                class="image-item"
                :class="{ 'primary': image.is_primary }"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragend="handleDragEnd"
              >
                <img :src="image.image_url" :alt="image.alt_text || `画像 ${index + 1}`">
                <div class="image-controls">
                  <button 
                    type="button" 
                    class="primary-btn"
                    :class="{ active: image.is_primary }"
                    @click="setPrimaryImage(image.id)"
                    title="メイン画像に設定"
                  >
                    ⭐
                  </button>
                  <button 
                    type="button" 
                    class="delete-btn"
                    @click="deleteImage(image.id)"
                    title="画像を削除"
                  >
                    🗑️
                  </button>
                </div>
                <div class="image-order">{{ index + 1 }}</div>
                <div v-if="image.is_primary" class="primary-badge">メイン</div>
              </div>
            </div>
          </div>
          
          <!-- 手動URL入力（オプション） -->
          <div class="manual-url-section">
            <label class="toggle-manual" @click="showManualInput = !showManualInput">
              🔗 手動でURLを追加
            </label>
            <div v-if="showManualInput" class="manual-input">
              <input
                v-model="manualImageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
              >
              <button type="button" @click="addManualImage" class="add-url-btn">
                追加
              </button>
            </div>
          </div>
          
          <!-- 後方互換性のための単一画像フィールド（非表示） -->
          <input v-model="currentProduct.image" type="hidden">
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
      <h3>商品一覧 ({{ products.length }}件)</h3>
      
      <!-- 商品がない場合のメッセージ -->
      <div v-if="products.length === 0" class="no-products">
        <p>登録された商品がありません。</p>
        <p>上のフォームから新しい商品を追加してください。</p>
      </div>
      
      <!-- 商品グリッド -->
      <div v-else class="product-grid">
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
            <button 
              @click="deleteProduct(product.id)" 
              @click.stop
              @touchstart.passive
              class="btn-delete" 
              type="button"
            >
              削除
            </button>
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
import { 
  getProductImages, 
  addProductImage, 
  updateProductImage, 
  deleteProductImage, 
  updateImageDisplayOrder 
} from '../lib/productImages'

const products = ref([])
const editingId = ref(null)
const uploadProgress = ref(0)
const showManualInput = ref(false)
const productImages = ref([])
const manualImageUrl = ref('')
const draggedIndex = ref(null)
const tempImages = ref([]) // 新規商品用の一時画像保存
const tempImageFiles = ref([]) // アップロード予定のファイル
const editForm = ref(null) // フォーム要素への参照
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
  console.log('商品一覧を読み込み中...')
  
  try {
    const { data, error } = await supabase
      .from('succulents')
      .select('id, name, description, price, quantity, is_reserved, image')
      .order('id', { ascending: true })
    
    if (error) {
      console.error('Error loading products:', error)
      return
    }
    
    console.log('読み込まれた商品:', data)
    products.value = data || []
  } catch (error) {
    console.error('商品読み込み時にエラーが発生しました:', error)
    products.value = []
  }
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

    let savedProductId = editingId.value

    if (editingId.value) {
      // 更新
      const { error } = await supabase
        .from('succulents')
        .update(productData)
        .eq('id', editingId.value)
      
      if (error) throw error
      console.log('商品を更新しました')
    } else {
      // 新規追加
      const { data, error } = await supabase
        .from('succulents')
        .insert([productData])
        .select()
        .single()
      
      if (error) throw error
      savedProductId = data.id
      console.log('商品を追加しました:', savedProductId)
      
      // 新規商品の場合、一時画像をアップロード
      if (tempImages.value.length > 0) {
        await uploadTempImages(savedProductId)
      }
    }
    
    alert(editingId.value ? '商品を更新しました' : '商品を追加しました')
    
    // フォームをリセット
    resetForm()
    // 商品一覧を再読み込み
    loadProducts()
  } catch (error) {
    console.error('Error saving product:', error)
    alert('エラーが発生しました: ' + error.message)
  }
}

// 編集を開始
const startEdit = async (product) => {
  editingId.value = product.id
  
  // 商品の画像を読み込み
  await loadProductImages(product.id)
  
  // nextTickを使用してDOMの更新を待つ
  nextTick(() => {
    // 各フィールドを個別に設定してリアクティブ更新を確実にする
    currentProduct.value.name = product.name || ''
    currentProduct.value.description = product.description || ''
    currentProduct.value.price = product.price || 0
    currentProduct.value.quantity = product.quantity || 1
    currentProduct.value.is_reserved = product.is_reserved || false
    currentProduct.value.image = product.image || ''
    
    // 編集フォームまでスムーズにスクロール
    if (editForm.value) {
      editForm.value.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
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
  productImages.value = []
  manualImageUrl.value = ''
  uploadProgress.value = 0
  
  // 一時画像のプレビューURLを解放
  tempImages.value.forEach(img => {
    if (img.preview_url) {
      URL.revokeObjectURL(img.preview_url)
    }
  })
  tempImages.value = []
  tempImageFiles.value = []
  
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

// 商品の画像一覧を読み込み
const loadProductImages = async (productId) => {
  try {
    const images = await getProductImages(productId)
    productImages.value = images
    
    // メイン画像をcurrentProduct.imageに設定（後方互換性）
    const primaryImage = images.find(img => img.is_primary)
    if (primaryImage) {
      currentProduct.value.image = primaryImage.image_url
    }
  } catch (error) {
    console.error('画像の読み込みに失敗しました:', error)
  }
}

// 複数画像選択処理
const handleMultipleImageSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  // 新規商品の場合は一時保存
  if (!editingId.value) {
    handleTempImageSelect(files)
    return
  }
  
  try {
    uploadProgress.value = 0
    const totalFiles = files.length
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await uploadSingleImage(file, i === 0 && productImages.value.length === 0) // 最初の画像をプライマリに
      uploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)
    }
    
    // 画像一覧を再読み込み
    await loadProductImages(editingId.value)
    uploadProgress.value = 0
    
    // ファイル入力をリセット
    event.target.value = ''
  } catch (error) {
    console.error('画像アップロードに失敗しました:', error)
    console.error('エラー詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    
    // 詳細なエラーメッセージを表示
    let errorMessage = '画像のアップロードに失敗しました。'
    if (error.message?.includes('relation "product_images" does not exist')) {
      errorMessage += '\n複数画像機能を使用するには、データベースのマイグレーションが必要です。'
    } else if (error.code === '42501') {
      errorMessage += '\n権限が不足しています。管理者でログインしてください。'
    } else if (error.message?.includes('storage')) {
      errorMessage += '\nストレージの設定を確認してください。'
    }
    
    alert(errorMessage)
    uploadProgress.value = 0
  }
}

// 新規商品の場合の一時画像選択処理
const handleTempImageSelect = (files) => {
  const newTempImages = []
  const newTempFiles = []
  
  Array.from(files).forEach((file, index) => {
    // ファイルから一時的なプレビューURLを作成
    const previewUrl = URL.createObjectURL(file)
    
    const tempImage = {
      id: `temp-${Date.now()}-${index}`,
      file: file,
      preview_url: previewUrl,
      alt_text: file.name,
      is_primary: tempImages.value.length === 0 && index === 0, // 最初の画像をプライマリに
      display_order: tempImages.value.length + index
    }
    
    newTempImages.push(tempImage)
    newTempFiles.push(file)
  })
  
  // 既存の一時画像に追加
  tempImages.value = [...tempImages.value, ...newTempImages]
  tempImageFiles.value = [...tempImageFiles.value, ...newTempFiles]
  
  // 最初の画像をcurrentProduct.imageに設定（プレビュー用）
  if (tempImages.value.length > 0 && !currentProduct.value.image) {
    const primaryImage = tempImages.value.find(img => img.is_primary) || tempImages.value[0]
    currentProduct.value.image = primaryImage.preview_url
  }
  
  console.log('一時画像を追加しました:', tempImages.value.length, '枚')
}

// 単一画像のアップロード
const uploadSingleImage = async (file, isPrimary = false) => {
  console.log('画像アップロード開始:', file.name)
  
  try {
    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomId}.${fileExtension}`
    
    console.log('ストレージにアップロード中:', fileName)
    
    // Supabaseストレージにアップロード
    const { data, error } = await supabase.storage
      .from('succulents-images')
      .upload(fileName, file)
    
    if (error) {
      console.error('ストレージアップロードエラー:', error)
      throw error
    }
    
    console.log('ストレージアップロード成功:', data)
    
    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('succulents-images')
      .getPublicUrl(fileName)
    
    console.log('公開URL取得:', publicUrl)
    
    // データベースに画像情報を保存
    console.log('データベースに画像情報を保存中...')
    await addProductImage(editingId.value, publicUrl, {
      displayOrder: productImages.value.length,
      altText: file.name,
      isPrimary: isPrimary
    })
    
    console.log('画像アップロード完了')
  } catch (error) {
    console.error('uploadSingleImageでエラー:', error)
    throw error
  }
}

// 一時画像を実際にアップロード
const uploadTempImages = async (productId) => {
  console.log('一時画像をアップロード中...', tempImages.value.length, '枚')
  
  try {
    uploadProgress.value = 0
    const totalImages = tempImages.value.length
    
    for (let i = 0; i < tempImages.value.length; i++) {
      const tempImage = tempImages.value[i]
      console.log(`画像 ${i + 1}/${totalImages} をアップロード中:`, tempImage.alt_text)
      
      // ファイル名を生成
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const fileExtension = tempImage.file.name.split('.').pop()
      const fileName = `${timestamp}_${randomId}_${i}.${fileExtension}`
      
      // ストレージにアップロード  
      const { data, error: uploadError } = await supabase.storage
        .from('succulents-images')
        .upload(fileName, tempImage.file)
      
      if (uploadError) {
        console.error('ストレージアップロードエラー:', uploadError)
        // ストレージエラーの場合はフォールバック（単一画像フィールドに最初の画像を保存）
        if (i === 0) {
          console.log('フォールバック: 単一画像フィールドを使用')
          const { data: { publicUrl } } = supabase.storage
            .from('succulents-images')
            .getPublicUrl(fileName)
          
          await supabase
            .from('succulents')
            .update({ image: publicUrl })
            .eq('id', productId)
        }
        continue
      }
      
      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('succulents-images')
        .getPublicUrl(fileName)
      
      try {
        // product_imagesテーブルに保存を試行
        await addProductImage(productId, publicUrl, {
          displayOrder: i,
          altText: tempImage.alt_text,
          isPrimary: tempImage.is_primary
        })
        console.log(`画像 ${i + 1} をproduct_imagesテーブルに保存完了`)
      } catch (dbError) {
        console.error('product_imagesテーブルへの保存に失敗:', dbError)
        
        // フォールバック: 最初の画像のみsucculents.imageフィールドに保存
        if (i === 0) {
          console.log('フォールバック: succulents.imageフィールドに保存')
          await supabase
            .from('succulents')
            .update({ image: publicUrl })
            .eq('id', productId)
        }
      }
      
      uploadProgress.value = Math.round(((i + 1) / totalImages) * 100)
    }
    
    console.log('すべての一時画像のアップロードが完了しました')
    uploadProgress.value = 0
    
  } catch (error) {
    console.error('一時画像のアップロードに失敗しました:', error)
    uploadProgress.value = 0
    throw error
  }
}

// 手動URL追加
const addManualImage = async () => {
  if (!manualImageUrl.value.trim()) return
  
  if (!editingId.value) {
    alert('まず商品を保存してから画像を追加してください')
    return
  }
  
  try {
    await addProductImage(editingId.value, manualImageUrl.value, {
      displayOrder: productImages.value.length,
      altText: '',
      isPrimary: productImages.value.length === 0
    })
    
    manualImageUrl.value = ''
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('画像の追加に失敗しました:', error)
    alert('画像の追加に失敗しました')
  }
}

// メイン画像に設定
const setPrimaryImage = async (imageId) => {
  try {
    await updateProductImage(imageId, { is_primary: true })
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('メイン画像の設定に失敗しました:', error)
    alert('メイン画像の設定に失敗しました')
  }
}

// 画像削除
const deleteImage = async (imageId) => {
  if (!confirm('この画像を削除しますか？')) return
  
  try {
    await deleteProductImage(imageId)
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('画像の削除に失敗しました:', error)
    alert('画像の削除に失敗しました')
  }
}

// ドラッグ&ドロップで順序変更
const handleDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  draggedIndex.value = null
}

const handleDrop = async (event) => {
  event.preventDefault()
  
  if (draggedIndex.value === null) return
  
  const dropZone = event.target.closest('.image-item')
  if (!dropZone) return
  
  const targetIndex = Array.from(dropZone.parentNode.children).indexOf(dropZone)
  
  if (draggedIndex.value === targetIndex) return
  
  // 配列の順序を変更
  const newImages = [...productImages.value]
  const draggedImage = newImages.splice(draggedIndex.value, 1)[0]
  newImages.splice(targetIndex, 0, draggedImage)
  
  // 表示順序を更新
  const imageIds = newImages.map(img => img.id)
  
  try {
    await updateImageDisplayOrder(imageIds)
    await loadProductImages(editingId.value)
  } catch (error) {
    console.error('順序の更新に失敗しました:', error)
    alert('順序の更新に失敗しました')
  }
}

// 一時画像を削除
const removeTempImage = (imageId) => {
  const index = tempImages.value.findIndex(img => img.id === imageId)
  if (index >= 0) {
    // プレビューURLを解放
    URL.revokeObjectURL(tempImages.value[index].preview_url)
    
    tempImages.value.splice(index, 1)
    tempImageFiles.value.splice(index, 1)
    
    // 順序を再調整
    tempImages.value.forEach((img, idx) => {
      img.display_order = idx
    })
    
    // プライマリ画像を再設定
    updateTempPrimaryImage()
  }
}

// 一時画像をプライマリに設定
const setTempPrimaryImage = (imageId) => {
  tempImages.value.forEach(img => {
    img.is_primary = img.id === imageId
  })
  
  // currentProduct.imageを更新
  const primaryImage = tempImages.value.find(img => img.is_primary)
  if (primaryImage) {
    currentProduct.value.image = primaryImage.preview_url
  }
}

// プライマリ画像を自動設定（削除後など）
const updateTempPrimaryImage = () => {
  const hasPrimary = tempImages.value.some(img => img.is_primary)
  
  if (!hasPrimary && tempImages.value.length > 0) {
    tempImages.value[0].is_primary = true
    currentProduct.value.image = tempImages.value[0].preview_url
  } else if (tempImages.value.length === 0) {
    currentProduct.value.image = ''
  }
}

// 一時画像の順序を変更
const moveTempImage = (fromIndex, toIndex) => {
  if (fromIndex === toIndex) return
  
  const movedImage = tempImages.value.splice(fromIndex, 1)[0]
  tempImages.value.splice(toIndex, 0, movedImage)
  
  // 順序を再調整
  tempImages.value.forEach((img, idx) => {
    img.display_order = idx
  })
}

// コンポーネント初期化時に商品一覧を読み込み
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
  object-fit: contain;
  display: block;
  background-color: #f8f9fa;
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
  border: 1px solid #007bff;
  transform: scale(1.02);
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
  min-height: 44px; /* タッチターゲット最小サイズ */
  touch-action: manipulation; /* タッチ操作の最適化 */
  user-select: none; /* テキスト選択防止 */
  -webkit-user-select: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1); /* タッチ時のハイライト */
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-edit:active {
  background: #004085;
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-delete:active {
  background: #bd2130;
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
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

/* 複数画像アップロード用スタイル */
.multiple-image-upload-section {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafafa;
}

.images-gallery {
  margin-top: 1.5rem;
}

.images-gallery h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  min-height: 100px;
}

.image-item {
  position: relative;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: move;
  transition: all 0.3s ease;
}

.image-item:hover {
  border-color: #2c5f2d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-item.primary {
  border-color: #ffd700;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  background-color: #f8f9fa;
}

.image-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.primary-btn, .delete-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.primary-btn:hover {
  background: rgba(255, 215, 0, 0.9);
}

.primary-btn.active {
  background: #ffd700;
  color: #333;
}

.delete-btn:hover {
  background: rgba(220, 53, 69, 0.9);
}

.image-order {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffd700;
  color: #333;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  padding: 4px;
}

.manual-input {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.manual-input input {
  flex: 1;
}

.add-url-btn {
  background: #2c5f2d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.add-url-btn:hover {
  background: #1e4220;
}

/* 一時画像用のスタイル */
.temp-image-item {
  position: relative;
}

.temp-badge {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #f0ad4e;
  color: white;
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 2px;
}

.temp-images-grid .image-item {
  border-color: #f0ad4e;
}

.temp-images-grid .image-item:hover {
  border-color: #ec971f;
  box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
}

/* レスポンシブ対応 */
@media screen and (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .image-item img {
    height: 100px;
  }
  
  .multiple-image-upload-section {
    padding: 1rem;
  }
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
    padding: 0.75rem;
    font-size: 0.9rem;
    min-height: 44px; /* Appleのタッチターゲット推奨サイズ */
    touch-action: manipulation; /* タッチ操作の最適化 */
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1); /* タッチ時のハイライト */
  }
  
  .products-list {
    padding: 0.75rem;
  }
  
  .form-row {
    gap: 1rem;
  }
}

.no-products {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
  border: 2px dashed #ddd;
}

.no-products p {
  margin: 0.5rem 0;
}
</style>
