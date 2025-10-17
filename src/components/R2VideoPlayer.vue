<template>
  <div class="r2-video-player" v-if="videoUrl">
    <video 
      ref="videoElement"
      :src="videoUrl"
      controls
      preload="metadata"
      class="video-element"
      @loadstart="onLoadStart"
      @canplay="onCanPlay"
      @error="onError"
      @loadedmetadata="onLoadedMetadata"
    >
      <p>お使いのブラウザは動画再生をサポートしていません。</p>
    </video>
    <div v-if="loading" class="loading-indicator">
      動画を読み込み中...
    </div>
    <div v-if="error" class="error-message">
      動画の読み込みに失敗しました: {{ error }}
    </div>
    <div v-if="metadata" class="video-info">
      <small>{{ formatDuration(metadata.duration) }} • {{ formatFileSize(metadata.size) }}</small>
    </div>
  </div>
  <div v-else class="no-video">
    動画がありません
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  videoUrl: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: false
  }
})

const videoElement = ref(null)
const loading = ref(true)
const error = ref(null)
const metadata = ref(null)

const onLoadStart = () => {
  loading.value = true
  error.value = null
}

const onCanPlay = () => {
  loading.value = false
  if (props.autoplay && videoElement.value) {
    videoElement.value.play().catch(err => {
      console.warn('Autoplay failed:', err)
    })
  }
}

const onError = (event) => {
  loading.value = false
  const videoEl = event.target
  if (videoEl.error) {
    switch (videoEl.error.code) {
      case videoEl.error.MEDIA_ERR_ABORTED:
        error.value = '動画の読み込みが中断されました'
        break
      case videoEl.error.MEDIA_ERR_NETWORK:
        error.value = 'ネットワークエラーが発生しました'
        break
      case videoEl.error.MEDIA_ERR_DECODE:
        error.value = '動画の形式がサポートされていません'
        break
      case videoEl.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        error.value = '動画ファイルが見つかりません'
        break
      default:
        error.value = '不明なエラーが発生しました'
    }
  }
}

const onLoadedMetadata = () => {
  if (videoElement.value) {
    metadata.value = {
      duration: videoElement.value.duration,
      size: null // ファイルサイズは別途取得する必要がある
    }
  }
}

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

watch(() => props.videoUrl, () => {
  loading.value = true
  error.value = null
  metadata.value = null
})

onMounted(() => {
  if (videoElement.value) {
    // プリロードの設定
    videoElement.value.preload = 'metadata'
  }
})
</script>

<style scoped>
.r2-video-player {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.video-element {
  width: 100%;
  height: auto;
  border-radius: 8px;
  background: #000;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1rem;
  border-radius: 4px;
  pointer-events: none;
}

.error-message {
  color: #dc3545;
  padding: 1rem;
  text-align: center;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 1rem;
}

.video-info {
  text-align: center;
  margin-top: 0.5rem;
  color: #666;
}

.no-video {
  text-align: center;
  color: #666;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}
</style>
