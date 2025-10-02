<template>
  <div class="splash-screen">
    <div 
      class="splash-image"
      :class="{ 'zoom-out': isAnimating }"
    >
      <img src="/logo.jpg" alt="SUS plants shop">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  duration: {
    type: Number,
    default: 3000  // 3秒間表示（元の設定）
  },
  animationDelay: {
    type: Number,
    default: 1200  // 1.2秒後にアニメーション開始（元の設定）
  }
})

const emit = defineEmits(['finished'])

const isAnimating = ref(false)

onMounted(() => {
  // アニメーションの開始
  setTimeout(() => {
    isAnimating.value = true
  }, props.animationDelay)

  // アニメーション完了後にイベントを発行
  setTimeout(() => {
    emit('finished')
  }, props.duration)
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  opacity: 1;
  transition: opacity 1.8s ease-in-out;
}

.splash-screen.fade-out {
  opacity: 0;
}

.splash-image {
  width: 400px;
  height: 400px;
  transform: scale(1);
  opacity: 1;
  transition: all 1.5s ease-in-out;
}

.splash-image.zoom-out {
  transform: scale(1.3);
  opacity: 0;
}

.splash-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}





@media (max-width: 768px) {
  .splash-image {
    width: 280px;
    height: 280px;
  }
}
</style>
