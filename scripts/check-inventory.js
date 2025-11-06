import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .envファイルを読み込む
dotenv.config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInventory() {
  console.log('📦 在庫状況を確認中...\n')
  
  try {
    // 全商品の在庫を取得
    const { data: products, error } = await supabase
      .from('succulents')
      .select('id, name, quantity, is_reserved, price')
      .order('name')

    if (error) {
      console.error('❌ エラー:', error.message)
      return
    }

    if (!products || products.length === 0) {
      console.log('⚠️  商品が見つかりませんでした')
      return
    }

    console.log(`✅ 商品数: ${products.length}件\n`)
    console.log('─'.repeat(80))
    
    products.forEach((product, index) => {
      const stockStatus = product.quantity === 0 ? '❌ 在庫なし' : 
                         product.quantity < 3 ? '⚠️  在庫少' : 
                         '✅ 在庫あり'
      const reservedStatus = product.is_reserved ? '🔒 取引中' : ''
      
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   ID: ${product.id}`)
      console.log(`   在庫: ${product.quantity}個 ${stockStatus} ${reservedStatus}`)
      console.log(`   価格: ¥${product.price.toLocaleString()}`)
      console.log('─'.repeat(80))
    })

    // 在庫統計
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0)
    const outOfStock = products.filter(p => p.quantity === 0).length
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity < 3).length
    const reserved = products.filter(p => p.is_reserved).length

    console.log('\n📊 統計情報:')
    console.log(`   総在庫数: ${totalStock}個`)
    console.log(`   在庫切れ商品: ${outOfStock}件`)
    console.log(`   在庫少商品: ${lowStock}件`)
    console.log(`   取引中商品: ${reserved}件`)

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

async function resetInventory(productId, newQuantity) {
  console.log(`\n🔄 商品ID: ${productId} の在庫を ${newQuantity} 個に更新中...\n`)
  
  try {
    const { data, error } = await supabase
      .from('succulents')
      .update({ 
        quantity: newQuantity,
        is_reserved: false 
      })
      .eq('id', productId)
      .select()

    if (error) {
      console.error('❌ 更新エラー:', error.message)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ 在庫を更新しました:')
      console.log(`   商品名: ${data[0].name}`)
      console.log(`   新在庫数: ${data[0].quantity}個`)
      console.log(`   取引中フラグ: ${data[0].is_reserved}`)
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

// コマンドライン引数を処理
const args = process.argv.slice(2)
const command = args[0]

if (command === 'reset' && args[1] && args[2]) {
  const productId = args[1]
  const newQuantity = parseInt(args[2], 10)
  
  if (isNaN(newQuantity)) {
    console.error('❌ 数量は数値で指定してください')
    process.exit(1)
  }
  
  await resetInventory(productId, newQuantity)
  console.log('\n更新後の在庫状況:')
  await checkInventory()
} else {
  await checkInventory()
  console.log('\n💡 使い方:')
  console.log('   在庫確認: node scripts/check-inventory.js')
  console.log('   在庫リセット: node scripts/check-inventory.js reset <商品ID> <新在庫数>')
}
