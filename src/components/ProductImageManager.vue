<template>
  <div class="product-image-manager">
    <div class="header">
      <h3>商品画像管理</h3>
      <button @click="showUploadModal = true" class="add-image-btn">
        📷 画像を追加
      </button>
    </div>

    <!-- 画像一覧 -->
    <div v-if="images.length > 0" class="images-grid">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="image-item"
        :class="{ 'is-primary': image.is_primary }"
      >
        <div class="image-container">
          <img :src="image.image_url" :alt="image.alt_text" />
          <div class="image-overlay">
            <button @click="setAsPrimary(image.id)" class="primary-btn" :disabled="image.is_primary">
              {{ image.is_primary ? '👑 メイン' : '👑' }}
            </button>
            <button @click="editImage(image)" class="edit-btn">
              ✏️
            </button>
            <button @click="deleteImage(image.id)" class="delete-btn" :disabled="images.length === 1">
              🗑️
            </button>
          </div>
          <div class="sort-controls">
            <button @click="moveImage(index, -1)" :disabled="index === 0" class="move-btn">
              ↑
            </button>
            <span class="sort-order">{{ index + 1 }}</span>
            <button @click="moveImage(index, 1)" :disabled="index === images.length - 1" class="move-btn">
              ↓
            </button>
          </div>
        </div>
        <div class="image-info">
          <p class="alt-text">{{ image.alt_text || '(説明なし)' }}</p>
        </div>
      </div>
    </div>

    <!-- 画像がない場合 -->
    <div v-else class="no-images">
      <p>画像が登録されていません</p>
      <button @click="showUploadModal = true" class="add-first-image-btn">
        最初の画像を追加
      </button>
    </div>

    <!-- 画像アップロードモーダル -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeUploadModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>{{ editingImage ? '画像を編集' : '画像を追加' }}</h4>
          <button @click="closeUploadModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>画像ファイル</label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              ref="fileInput"
              :disabled="uploading"
            />
          </div>
          <div class="form-group">
            <label>画像の説明（Alt text）</label>
            <input
              type="text"
              v-model="imageForm.altText"
              placeholder="画像の説明を入力"
              maxlength="200"
            />
          </div>
          <div class="form-group">
            <label>
              <input
                type="checkbox"
                v-model="imageForm.isPrimary"
              />
              この画像をメイン画像に設定
            </label>
          </div>
          <div v-if="selectedFile" class="preview-container">
            <img :src="previewUrl" alt="プレビュー" class="preview-image" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeUploadModal" class="cancel-btn" :disabled="uploading">
            キャンセル
          </button>
          <button @click="saveImage" class="save-btn" :disabled="uploading || (!selectedFile && !editingImage)">
            {{ uploading ? 'アップロード中...' : (editingImage ? '更新' : '追加') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="loading" class="loading">
      画像を読み込み中...
    </div>

    <!-- メッセージ表示 -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import {
  getProductImages,
  addProductImage,
  updateProductImage,
  deleteProductImage,
  updateProductImagesOrder
} from '../lib/productImages'

const props = defineProps({
  productId: {
    type: String,
    required: true
  }
})

const images = ref([])
const loading = ref(false)
const showUploadModal = ref(false)
const uploading = ref(false)
const selectedFile = ref(null)
const previewUrl = ref('')
const editingImage = ref(null)
const fileInput = ref(null)

const imageForm = ref({
  altText: '',
  isPrimary: false
})

const message = ref('')
const messageType = ref('success')

// 商品画像を読み込み
const loadImages = async () => {
  loading.value = true
  try {
    const result = await getProductImages(props.productId)
    if (result.success) {
      images.value = result.data
    } else {
      showMessage('画像の読み込みに失敗しました', 'error')
    }
  } catch (error) {
    console.error('画像読み込みエラー:', error)
    showMessage('画像の読み込みに失敗しました', 'error')
  } finally {
    loading.value = false
  }
}

// ファイル選択処理
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

// 画像をアップロード
const uploadImage = async (file) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `product-images/${fileName}`

  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(filePath)

  return publicUrl
}

// 画像を保存
const saveImage = async () => {
  uploading.value = true
  try {
    let imageUrl = editingImage.value?.image_url

    // 新しいファイルが選択されている場合はアップロード
    if (selectedFile.value) {
      imageUrl = await uploadImage(selectedFile.value)
    }

    if (editingImage.value) {
      // 編集の場合
      const result = await updateProductImage(editingImage.value.id, {
        image_url: imageUrl,
        alt_text: imageForm.value.altText,
        is_primary: imageForm.value.isPrimary
      })
      if (result.success) {
        showMessage('画像を更新しました', 'success')
      } else {
        throw new Error(result.error)
      }
    } else {
      // 新規追加の場合
      const result = await addProductImage(
        props.productId,
        imageUrl,
        imageForm.value.altText,
        images.value.length, // 最後に追加
        imageForm.value.isPrimary
      )
      if (result.success) {
        showMessage('画像を追加しました', 'success')
      } else {
        throw new Error(result.error)
      }
    }

    await loadImages()
    closeUploadModal()
  } catch (error) {
    console.error('画像保存エラー:', error)
    showMessage('画像の保存に失敗しました', 'error')
  } finally {
    uploading.value = false
  }
}

// メイン画像に設定
const setAsPrimary = async (imageId) => {
  try {
    const result = await updateProductImage(imageId, { is_primary: true })
    if (result.success) {
      showMessage('メイン画像を設定しました', 'success')
      await loadImages()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('メイン画像設定エラー:', error)
    showMessage('メイン画像の設定に失敗しました', 'error')
  }
}

// 画像を編集
const editImage = (image) => {
  editingImage.value = image
  imageForm.value = {
    altText: image.alt_text || '',
    isPrimary: image.is_primary
  }
  showUploadModal.value = true
}

// 画像を削除
const deleteImage = async (imageId) => {
  if (!confirm('この画像を削除しますか？')) return

  try {
    const result = await deleteProductImage(imageId)
    if (result.success) {
      showMessage('画像を削除しました', 'success')
      await loadImages()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('画像削除エラー:', error)
    showMessage('画像の削除に失敗しました', 'error')
  }
}

// 画像の順序を変更
const moveImage = async (currentIndex, direction) => {
  const newIndex = currentIndex + direction
  if (newIndex < 0 || newIndex >= images.value.length) return

  // 配列の順序を変更
  const newImages = [...images.value]
  const [movedImage] = newImages.splice(currentIndex, 1)
  newImages.splice(newIndex, 0, movedImage)

  try {
    const result = await updateProductImagesOrder(props.productId, newImages)
    if (result.success) {
      images.value = newImages
      showMessage('画像の順序を変更しました', 'success')
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('順序変更エラー:', error)
    showMessage('順序の変更に失敗しました', 'error')
  }
}

// モーダルを閉じる
const closeUploadModal = () => {
  showUploadModal.value = false
  editingImage.value = null
  selectedFile.value = null
  previewUrl.value = ''
  imageForm.value = {
    altText: '',
    isPrimary: false
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// メッセージを表示
const showMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

// プロダクトIDが変更されたら画像を再読み込み
watch(() => props.productId, (newId) => {
  if (newId) {
    loadImages()
  }
})

onMounted(() => {
  if (props.productId) {
    loadImages()
  }
})
</script>

<style scoped>
.product-image-manager {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h3 {
  margin: 0;
  color: #2c5f2d;
}

.add-image-btn, .add-first-image-btn {
  background: #2c5f2d;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.add-image-btn:hover, .add-first-image-btn:hover {
  background: #1e4220;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.image-item {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.image-item.is-primary {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.image-container {
  position: relative;
}

.image-container img {
  width: 100%;
  height: 200px;
  object-fit: contain;
  background-color: #f8f9fa;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.primary-btn, .edit-btn, .delete-btn {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.primary-btn:disabled {
  background: rgba(255, 215, 0, 0.9);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sort-controls {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 0.25rem;
}

.move-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.sort-order {
  font-size: 0.8rem;
  font-weight: bold;
}

.image-info {
  padding: 0.75rem;
}

.alt-text {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.no-images {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h4 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input[type="file"],
.form-group input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.preview-container {
  margin-top: 1rem;
}

.preview-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.save-btn {
  background: #2c5f2d;
  color: white;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 1.5rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  min-width: 300px;
  max-width: 90%;
  text-align: center;
  white-space: pre-line;
  line-height: 1.6;
}

.message.success {
  border: 3px solid #28a745;
  color: #155724;
  background: #d4edda;
  font-weight: 600;
  font-size: 1.1rem;
}

.message.error {
  border: 3px solid #dc3545;
  color: #721c24;
  background: #f8d7da;
  font-weight: 600;
  font-size: 1.1rem;
}

@media screen and (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  
  .modal-content {
    width: 95%;
  }
}
</style>
