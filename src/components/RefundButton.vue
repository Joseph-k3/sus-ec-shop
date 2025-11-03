<template>
  <button 
    @click="handleRefund" 
    :disabled="loading || disabled"
    class="refund-button"
  >
    <i v-if="loading" class="fas fa-spinner fa-spin"></i>
    <i v-else class="fas fa-undo"></i>
    {{ loading ? '処理中...' : '返金' }}
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  orderId: { type: String, required: true },
  reason: { type: String, default: '管理者による返金処理' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['success', 'error'])

const loading = ref(false)

async function handleRefund() {
  if (!confirm('本当に返金を実行しますか？\nこの操作は取り消せません。')) {
    return
  }

  loading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('square-refund', {
      body: {
        orderId: props.orderId,
        reason: props.reason
      }
    })

    if (error) {
      console.error('❌ Refund API error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }

    console.log('✅ Refund success:', data)
    emit('success', data)
  } catch (error) {
    console.error('❌ Refund error:', error)
    console.error('Error message:', error.message)
    console.error('Error context:', error.context)
    
    // エラーの詳細をアラートで表示
    const errorMsg = error.context?.error || error.message || 'Unknown error'
    alert(`返金処理に失敗しました\n\nエラー: ${errorMsg}`)
    
    emit('error', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.refund-button {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.refund-button:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.refund-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.refund-button:active:not(:disabled) {
  transform: translateY(0);
}
</style>
