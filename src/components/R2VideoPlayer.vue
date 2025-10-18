<template>
  <div class="r2-video-player" v-if="videoUrl" @click.stop>
    <video 
      ref="videoElement"
      :src="videoUrl"
      controls
      playsinline
      preload="auto"
      class="video-element"
      @loadstart="onLoadStart"
      @canplay="onCanPlay"
      @error="onError"
      @loadedmetadata="onLoadedMetadata"
      @loadeddata="onLoadedData"
      @click.stop
    >
      <p>お使いのブラウザは動画再生をサポートしていません。</p>
    </video>
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>動画を読み込み中...</p>
    </div>
    <div v-if="error" class="error-message">
      動画の読み込みに失敗しました: {{ error }}
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
  // autoplayがtrueの場合、即座に再生を試みる
  if (props.autoplay && videoElement.value) {
    attemptAutoplay()
  }
}

const onLoadedData = () => {
  // データが完全にロードされた時点でも自動再生を試みる
  if (props.autoplay && videoElement.value && videoElement.value.paused) {
    attemptAutoplay()
  }
}

const attemptAutoplay = async () => {
  if (!videoElement.value) return
  
  try {
    // iOS Safariなどでの自動再生対応
    videoElement.value.muted = false
    await videoElement.value.play()
    loading.value = false
  } catch (err) {
    console.warn('自動再生に失敗しました。ユーザーのタップが必要な場合があります:', err)
    // ミュート状態で再試行
    try {
      videoElement.value.muted = true
      await videoElement.value.play()
      // 再生開始後にミュート解除を試みる
      setTimeout(() => {
        if (videoElement.value) {
          videoElement.value.muted = false
        }
      }, 100)
    } catch (retryErr) {
      console.warn('ミュート状態での自動再生も失敗:', retryErr)
    }
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
    // プリロードを'auto'に設定して即座にロード開始
    videoElement.value.preload = 'auto'
    
    // autoplayが有効な場合、マウント後すぐに再生試行
    if (props.autoplay) {
      // DOMが完全に準備されるまで少し待つ
      setTimeout(() => {
        attemptAutoplay()
      }, 100)
    }
  }
})
</script>

<style scoped>
.r2-video-player {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.video-element {
  width: 100%;
  height: 100%;
  max-height: 100vh;
  object-fit: contain;
  background: #000;
  outline: none;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  padding: 2rem;
  text-align: center;
  background: rgba(220, 53, 69, 0.9);
  border-radius: 12px;
  max-width: 80%;
  z-index: 10;
}

.no-video {
  text-align: center;
  color: white;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
}

/* スマホでのフルスクリーン最適化 */
@media screen and (max-width: 768px) {
  .r2-video-player {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
  }
  
  .video-element {
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
  }
}
</style>
