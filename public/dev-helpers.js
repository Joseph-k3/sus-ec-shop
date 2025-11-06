// 開発者用: ブラウザコンソールでカートをクリアするヘルパー

// ブラウザのコンソールで以下を実行してカートをクリア:
// localStorage.removeItem('shopping-cart')
// location.reload()

console.log('💡 カートをクリアするには、以下をコンソールで実行してください:')
console.log('localStorage.removeItem("shopping-cart"); location.reload()')

// グローバル関数として定義
window.clearCart = () => {
  localStorage.removeItem('shopping-cart')
  console.log('✅ カートをクリアしました。ページをリロードします...')
  location.reload()
}

window.showCart = () => {
  const cart = localStorage.getItem('shopping-cart')
  if (cart) {
    console.log('🛒 現在のカート内容:')
    console.table(JSON.parse(cart))
  } else {
    console.log('🛒 カートは空です')
  }
}

console.log('🛠️ 利用可能なコマンド:')
console.log('  clearCart() - カートをクリアしてリロード')
console.log('  showCart()  - カート内容を表示')
