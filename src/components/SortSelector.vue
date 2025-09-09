<template>
  <div class="sort-selector">
    <label for="sort">並び替え：</label>
    <select id="sort" v-model="selected" @change="$emit('update:sort', selected)">
      <option value="default">出品順</option>
      <option value="price-asc">価格が安い順</option>
      <option value="price-desc">価格が高い順</option>
      <option value="name-asc">名前順（A→Z）</option>
      <option value="name-desc">名前順（Z→A）</option>
    </select>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  sort: String
})
const selected = ref(props.sort || 'default')
watch(() => props.sort, (val) => { selected.value = val })
</script>

<style scoped>
.sort-selector {
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-selector label {
  margin: 0;
  white-space: nowrap;
  font-weight: 500;
  color: #495057;
}

.sort-selector select {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  font-size: 1rem;
  font-weight: 500;
  color: #495057;
  min-width: 150px;
  height: 44px;
  box-sizing: border-box;
}

.sort-selector select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}
</style>
