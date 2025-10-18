<template>
  <div class="r2-video-player" v-if="videoUrl" @click.stop="toggleControls">
    <video 
      ref="videoElement"
      :src="videoUrl"
      playsinline
      preload="auto"
      class="video-element"
      @loadstart="onLoadStart"
      @canplay="onCanPlay"
      @error="onError"
      @loadedmetadata="onLoadedMetadata"
      @loadeddata="onLoadedData"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @click.stop="toggleControls"
    >
      <p>お使いのブラウザは動画再生をサポートしていません。</p>
    </video>
    
    <!-- カスタムコントロール -->
    <div v-show="showControls" class="custom-controls" @click.stop>
      <!-- 再生/一時停止ボタン -->
      <div class="controls-overlay">
        <button @click="skipBackward" class="control-btn skip-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
          <span class="skip-text">10</span>
        </button>
        
        <button @click="togglePlayPause" class="control-btn play-btn">
          <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>
        
        <button @click="skipForward" class="control-btn skip-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
          </svg>
          <span class="skip-text">10</span>
        </button>
      </div>
      
      <!-- プログレスバー -->
      <div class="progress-container" @click="seekTo">
        <div class="progress-bar">
          <div class="progress-filled" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>
    </div>
    
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
import { ref, watch, onMounted, onUnmounted } from 'vue'

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
const showControls = ref(true)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressPercent = ref(0)
let controlsTimeout = null

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

const onPlay = () => {
  isPlaying.value = true
  // 再生開始時にコントロールを表示し、1秒後に自動非表示
  showControls.value = true
  resetControlsTimeout()
}

const onPause = () => {
  isPlaying.value = false
  // 一時停止時はコントロールを表示し続ける
  showControls.value = true
  clearControlsTimeout()
}

const onTimeUpdate = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime
    duration.value = videoElement.value.duration || 0
    progressPercent.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  }
}

const toggleControls = () => {
  showControls.value = !showControls.value
  if (showControls.value && isPlaying.value) {
    resetControlsTimeout()
  }
}

const resetControlsTimeout = () => {
  clearControlsTimeout()
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false
    }
  }, 1000) // 1秒後に非表示
}

const clearControlsTimeout = () => {
  if (controlsTimeout) {
    clearTimeout(controlsTimeout)
    controlsTimeout = null
  }
}

const togglePlayPause = () => {
  if (!videoElement.value) return
  
  if (videoElement.value.paused) {
    videoElement.value.play()
  } else {
    videoElement.value.pause()
  }
}

const skipBackward = () => {
  if (!videoElement.value) return
  videoElement.value.currentTime = Math.max(0, videoElement.value.currentTime - 10)
  resetControlsTimeout()
}

const skipForward = () => {
  if (!videoElement.value) return
  videoElement.value.currentTime = Math.min(videoElement.value.duration, videoElement.value.currentTime + 10)
  resetControlsTimeout()
}

const seekTo = (event) => {
  if (!videoElement.value) return
  const progressBar = event.currentTarget
  const rect = progressBar.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  videoElement.value.currentTime = percent * videoElement.value.duration
  resetControlsTimeout()
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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

onUnmounted(() => {
  clearControlsTimeout()
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

/* カスタムコントロール */
.custom-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%);
  z-index: 10;
  transition: opacity 0.3s ease;
}

.controls-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
}

.control-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  touch-action: manipulation;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.1);
}

.control-btn:active {
  transform: scale(0.95);
}

.play-btn {
  width: 80px;
  height: 80px;
}

.skip-btn {
  width: 56px;
  height: 56px;
}

.skip-text {
  position: absolute;
  bottom: 8px;
  font-size: 11px;
  font-weight: bold;
  color: white;
}

.progress-container {
  padding: 1rem;
  cursor: pointer;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-filled {
  height: 100%;
  background: white;
  transition: width 0.1s linear;
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: white;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

@media screen and (max-width: 768px) {
  .controls-overlay {
    gap: 1.5rem;
    padding: 1rem;
  }
  
  .play-btn {
    width: 72px;
    height: 72px;
  }
  
  .skip-btn {
    width: 52px;
    height: 52px;
  }
  
  .skip-btn svg {
    width: 28px;
    height: 28px;
  }
  
  .progress-container {
    padding: 0.75rem;
  }
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
