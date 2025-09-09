import { sendBankTransferEmail, sendPaymentConfirmationEmail } from './src/lib/postmark.js'

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
  email: 'test@example.com', // 実際のメールアドレスに変更してください
  phone: '090-1234-5678',
  address: '〒123-4567\n東京都テスト区サンプル町1-2-3',
  payment_method: 'bank',
  status: 'pending_payment',
  payment_due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  payment_confirmed_at: new Date().toISOString()
}

async function testBankTransferEmail() {
  console.log('=== 銀行振込注文確認メールのテスト ===')
  try {
    const result = await sendBankTransferEmail(testOrder)
    console.log('✅ 銀行振込注文確認メール送信成功:', result)
  } catch (error) {
    console.error('❌ 銀行振込注文確認メール送信失敗:', error)
  }
}

async function testPaymentConfirmationEmail() {
  console.log('\n=== 入金確認メールのテスト ===')
  try {
    const result = await sendPaymentConfirmationEmail(testOrder)
    console.log('✅ 入金確認メール送信成功:', result)
  } catch (error) {
    console.error('❌ 入金確認メール送信失敗:', error)
  }
}

async function runTests() {
  console.log('メール送信機能のテストを開始します...\n')
  
  await testBankTransferEmail()
  await testPaymentConfirmationEmail()
  
  console.log('\nテスト完了')
  process.exit(0)
}

runTests()
