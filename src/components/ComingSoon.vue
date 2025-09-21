<template>
  <div class="coming-soon">
    <h1>Coming Soon</h1>
    <p class="message">販売期間外です。</p>
    <div class="period" v-if="siteSettings">
      <p>販売期間：</p>
      <p>{{ formatDateTime(siteSettings.publish_start) }} 〜 {{ formatDateTime(siteSettings.publish_end) }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  siteSettings: Object
})

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped>
.coming-soon {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: #f5f5f5;
  padding: 2rem;
}

h1 {
  font-size: 3rem;
  color: #2e7d32;
  margin-bottom: 1rem;
}

.message {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.period {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.period p {
  margin: 0.5rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  
  .message {
    font-size: 1.2rem;
  }
  
  .period {
    padding: 1rem;
  }
}
</style>
