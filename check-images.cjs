const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hcqgfdyentwazmyikvtl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcWdmZHllbnR3YXpteWlrdnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODcxNzYsImV4cCI6MjA2ODE2MzE3Nn0.cVlLktBIpOEGRJygkJyMZQGGT2xtryd6vsPO1tKbAlE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const checkNewImages = async () => {
  console.log('=== 新しい画像の確認 ===')
  
  const { data: products, error } = await supabase
    .from('succulents')
    .select('id, name, image')
    .limit(5)
  
  if (error) {
    console.error('商品データ取得エラー:', error)
    return
  }
  
  console.log('商品データ:')
  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name}`)
    console.log(`   画像URL: ${product.image}`)
    
    // 新しい画像URLにアクセステスト
    if (product.image) {
      fetch(product.image, { method: 'HEAD' })
        .then(response => {
          console.log(`   ステータス: ${response.status} ${response.statusText}`)
          if (response.ok) {
            console.log('   ✅ 画像アクセス成功')
          } else {
            console.log('   ❌ 画像アクセス失敗')
          }
        })
        .catch(err => {
          console.log(`   ❌ エラー: ${err.message}`)
        })
    }
  })
}

checkNewImages().catch(console.error)
