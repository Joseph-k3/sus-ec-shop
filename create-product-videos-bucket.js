import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createProductVideosBucket() {
  console.log('🛠️  product_videos バケットを作成中...\n')
  
  try {
    // バケットを作成（シンプルな設定）
    const { data, error } = await supabase.storage.createBucket('product_videos', {
      public: true
    })
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ product_videos バケットは既に存在します')
      } else {
        console.error('❌ バケット作成エラー:', error)
        console.error('\n手動で作成してください:')
        console.error('1. Supabase Dashboard → Storage')
        console.error('2. "Create a new bucket" をクリック')
        console.error('3. Name: product_videos')
        console.error('4. "Public bucket" にチェック')
        console.error('5. "Create bucket" をクリック')
      }
    } else {
      console.log('✅ product_videos バケットを作成しました')
      console.log('   データ:', data)
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err)
  }
}

createProductVideosBucket()
