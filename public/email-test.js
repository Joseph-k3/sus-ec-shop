// テスト用のグローバル関数
// ブラウザのコンソールで以下の関数を使用してメール送信をテストできます

window.testEmailSending = async () => {
  // テスト用の注文データ
  const testOrder = {
    id: 'test-123',
    order_number: 'ORD20250826TEST',
    product_id: 1,
    product_name: 'エケベリア・ラウイ',
    product_image: 'https://hcqgfdyentwazmyikvtl.supabase.co/storage/v1/object/public/product-images/echeveria-laui.jpg',
    price: 2500,
    quantity: 1,
    customer_name: 'テスト太郎',
    email: 'your-email@example.com', // 実際のメールアドレスに変更してください
    phone: '090-1234-5678',
    address: '〒123-4567\\n東京都テスト区サンプル町1-2-3',
    payment_method: 'bank',
    status: 'pending_payment',
    payment_due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    payment_confirmed_at: new Date().toISOString()
  }

  console.log('=== メール送信テスト開始 ===')
  
  // sendBankTransferEmailの動的インポート
  try {
    const { sendBankTransferEmail } = await import('./src/lib/postmark.js')
    
    console.log('銀行振込注文確認メールを送信中...')
    const result = await sendBankTransferEmail(testOrder)
    console.log('✅ 銀行振込注文確認メール送信成功:', result)
    
    return result
  } catch (error) {
    console.error('❌ メール送信エラー:', error)
    throw error
  }
}

window.testPaymentConfirmationEmail = async () => {
  const testOrder = {
    id: 'test-456',
    order_number: 'ORD20250826TEST2',
    product_id: 1,
    product_name: 'エケベリア・ラウイ',
    product_image: 'https://hcqgfdyentwazmyikvtl.supabase.co/storage/v1/object/public/product-images/echeveria-laui.jpg',
    price: 2500,
    quantity: 1,
    customer_name: 'テスト花子',
    email: 'your-email@example.com', // 実際のメールアドレスに変更してください
    phone: '090-9876-5432',
    address: '〒123-4567\\n東京都テスト区サンプル町4-5-6',
    payment_method: 'bank',
    status: 'paid',
    payment_due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    payment_confirmed_at: new Date().toISOString()
  }

  console.log('=== 入金確認メールテスト開始 ===')
  
  try {
    const { sendPaymentConfirmationEmail } = await import('./src/lib/postmark.js')
    
    console.log('入金確認メールを送信中...')
    const result = await sendPaymentConfirmationEmail(testOrder)
    console.log('✅ 入金確認メール送信成功:', result)
    
    return result
  } catch (error) {
    console.error('❌ 入金確認メール送信エラー:', error)
    throw error
  }
}

console.log('メール送信テスト関数が利用可能になりました:')
console.log('- testEmailSending() : 銀行振込注文確認メールのテスト')
console.log('- testPaymentConfirmationEmail() : 入金確認メールのテスト')
console.log('')
console.log('使用方法:')
console.log('1. testEmailSending() をコンソールで実行')
console.log('2. testPaymentConfirmationEmail() をコンソールで実行')
console.log('')
console.log('注意: テスト前に testEmailSending または testPaymentConfirmationEmail 関数内の')
console.log('email フィールドを実際のメールアドレスに変更してください')
