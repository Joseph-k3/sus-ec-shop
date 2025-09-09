/**
 * 日付を日本語フォーマットに変換
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} フォーマットされた日付文字列
 */
export const formatDate = (dateString) => {
  if (!dateString) return ''
  
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 支払期限日を生成（現在から7日後）
 * @returns {string} ISO形式の日付文字列
 */
export const createPaymentDueDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString()
}

/**
 * 価格を日本円表記にフォーマット
 * @param {number} price - 価格
 * @returns {string} フォーマットされた価格
 */
export const formatPrice = (price) => {
  return price?.toLocaleString('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }) || '¥0'
}

/**
 * 注文ステータスの日本語表記を取得
 * @param {string} status - 注文ステータス
 * @returns {string} 日本語のステータス
 */
export const getOrderStatusLabel = (status) => {
  const labels = {
    'pending_payment': '入金待ち',
    'paid': '入金済み',
    'shipped': '発送済み',
    'completed': '完了',
    'cancelled': 'キャンセル'
  }
  return labels[status] || status
}
