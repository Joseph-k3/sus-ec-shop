<template>
  <div 
    class="splash-screen"
    :class="{ 'fade-out': isAnimating }"
    v-if="!isFinished"
  >
    <div 
      class="splash-image"
      :class="{ 'zoom-out': isAnimating }"
    >
      <img src="/logo.jpg" alt="SUS plants shop">
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isAnimating = ref(false)
const isFinished = ref(false)

// アニメーションの開始
setTimeout(() => {
  isAnimating.value = true
}, 1200)

// アニメーション完了後にコンポーネントを削除
setTimeout(() => {
  isFinished.value = true
}, 3000)  // 合計時間も1秒延長
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
  justify-content: center;
  align-items: center;
  z-index: 2000;
  opacity: 1;
  transition: opacity 2s ease-in-out;
}

.splash-screen.fade-out {
  opacity: 0;
}

.splash-image {
  width: 300px;
  height: 300px;
  transform: scale(1);
  transition: transform 1.5s ease-in-out;
}

.splash-image.zoom-out {
  transform: scale(0.8);
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
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .splash-image {
    width: 200px;
    height: 200px;
  }
}
</style>
