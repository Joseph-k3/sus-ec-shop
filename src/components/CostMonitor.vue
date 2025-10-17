<template>
  <div class="cost-monitor">
    <h3>R2ストレージ使用量監視</h3>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h4>総使用量</h4>
        <p class="stat-value">{{ formatBytes(totalStorage) }}</p>
        <small>制限: 10GB (無料枠)</small>
      </div>
      
      <div class="stat-card">
        <h4>画像ファイル数</h4>
        <p class="stat-value">{{ imageCount }}</p>
      </div>
      
      <div class="stat-card">
        <h4>動画ファイル数</h4>
        <p class="stat-value">{{ videoCount }}</p>
      </div>
      
      <div class="stat-card">
        <h4>月間転送量</h4>
        <p class="stat-value">{{ formatBytes(monthlyTransfer) }}</p>
        <small>制限: 100GB (無料枠)</small>
      </div>
    </div>

    <div class="usage-details">
      <h4>ファイル別使用量</h4>
      <div class="file-list">
        <div v-for="file in fileList" :key="file.key" class="file-item">
          <div class="file-info">
            <span class="file-name">{{ file.key }}</span>
            <span class="file-size">{{ formatBytes(file.size) }}</span>
          </div>
          <div class="file-actions">
            <button @click="deleteFile(file.key)" class="delete-btn">削除</button>
          </div>
        </div>
      </div>
    </div>

    <div class="cost-estimation">
      <h4>月間コスト見積もり</h4>
      <div class="cost-breakdown">
        <div class="cost-item">
          <span>ストレージ料金:</span>
          <span>¥{{ calculateStorageCost() }}</span>
        </div>
        <div class="cost-item">
          <span>転送料金:</span>
          <span>¥{{ calculateTransferCost() }}</span>
        </div>
        <div class="cost-item total">
          <span>合計:</span>
          <span>¥{{ calculateTotalCost() }}</span>
        </div>
      </div>
    </div>

    <button @click="refreshData" class="refresh-btn" :disabled="loading">
      {{ loading ? '更新中...' : 'データを更新' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const totalStorage = ref(0)
const imageCount = ref(0)
const videoCount = ref(0)
const monthlyTransfer = ref(0)
const fileList = ref([])
const loading = ref(false)

// R2の使用量データを取得（模擬実装）
const fetchUsageData = async () => {
  loading.value = true
  
  try {
    // 実際の実装では、R2 APIまたは独自のAPIを呼び出す
    // ここでは模擬データを使用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    totalStorage.value = 2.5 * 1024 * 1024 * 1024 // 2.5GB
    imageCount.value = 45
    videoCount.value = 12
    monthlyTransfer.value = 15 * 1024 * 1024 * 1024 // 15GB
    
    // 模擬ファイルリスト
    fileList.value = [
      { key: 'images/1699123456-abc123.jpg', size: 245760 },
      { key: 'images/1699123457-def456.png', size: 189440 },
      { key: 'videos/1699123458-ghi789.mp4', size: 15728640 },
      { key: 'videos/1699123459-jkl012.mp4', size: 22369280 },
    ]
    
  } catch (error) {
    console.error('使用量データの取得に失敗:', error)
  } finally {
    loading.value = false
  }
}

// ファイルサイズをフォーマット
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// ストレージコストを計算（R2の料金体系に基づく）
const calculateStorageCost = () => {
  const freeLimit = 10 * 1024 * 1024 * 1024 // 10GB
  const overage = Math.max(0, totalStorage.value - freeLimit)
  const costPerGB = 0.015 // $0.015/GB/月
  const usdToJpy = 150 // 概算レート
  return Math.ceil(overage / (1024 * 1024 * 1024) * costPerGB * usdToJpy)
}

// 転送コストを計算
const calculateTransferCost = () => {
  const freeLimit = 100 * 1024 * 1024 * 1024 // 100GB
  const overage = Math.max(0, monthlyTransfer.value - freeLimit)
  const costPerGB = 0.05 // $0.05/GB
  const usdToJpy = 150
  return Math.ceil(overage / (1024 * 1024 * 1024) * costPerGB * usdToJpy)
}

// 総コストを計算
const calculateTotalCost = () => {
  return calculateStorageCost() + calculateTransferCost()
}

// ファイルを削除
const deleteFile = async (fileKey) => {
  if (!confirm(`${fileKey} を削除しますか？`)) return
  
  try {
    // 実際の実装では、R2からファイルを削除するAPIを呼び出す
    console.log('ファイル削除:', fileKey)
    
    // UIから削除
    fileList.value = fileList.value.filter(file => file.key !== fileKey)
    
    // 使用量を再計算（簡易実装）
    await refreshData()
    
    alert('ファイルを削除しました')
  } catch (error) {
    console.error('ファイル削除エラー:', error)
    alert('削除に失敗しました')
  }
}

// データを更新
const refreshData = () => {
  fetchUsageData()
}

onMounted(() => {
  fetchUsageData()
})
</script>

<style scoped>
.cost-monitor {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 2rem;
}

.cost-monitor h3 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.stat-card small {
  color: #999;
  font-size: 0.8rem;
}

.usage-details {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.usage-details h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.file-item:last-child {
  border-bottom: none;
}

.file-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-family: monospace;
  font-size: 0.9rem;
  color: #333;
}

.file-size {
  color: #666;
  font-size: 0.9rem;
}

.delete-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.delete-btn:hover {
  background: #c82333;
}

.cost-estimation {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.cost-estimation h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.cost-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.cost-item.total {
  border-top: 2px solid #2c3e50;
  font-weight: bold;
  color: #2c3e50;
  margin-top: 0.5rem;
  padding-top: 1rem;
}

.refresh-btn {
  display: block;
  margin: 0 auto;
  background: #4CAF50;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.refresh-btn:hover:not(:disabled) {
  background: #388E3C;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .cost-monitor {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
