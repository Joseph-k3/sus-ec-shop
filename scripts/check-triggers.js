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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTriggers() {
  console.log('🔍 データベーストリガーの状態を確認中...\n')
  
  try {
    // トリガーの一覧を取得（この方法では取得できないため、説明を表示）
    console.log('⚠️  注意: トリガーの状態は Supabase Dashboard から確認する必要があります\n')
    console.log('📋 確認方法:')
    console.log('1. https://app.supabase.com/ にアクセス')
    console.log('2. プロジェクトを選択')
    console.log('3. SQL Editor を開く')
    console.log('4. 以下のSQLを実行:\n')
    
    const checkSQL = `
-- トリガーの存在確認
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- トリガー関数の存在確認
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('check_stock_before_order', 'check_and_decrease_stock_on_order')
ORDER BY routine_name;
`
    
    console.log(checkSQL)
    console.log('\n📌 期待される結果:')
    console.log('   トリガー名: trigger_check_and_decrease_stock_on_order')
    console.log('   関数名: check_and_decrease_stock_on_order')
    console.log('')
    console.log('❌ もし古いトリガー trigger_check_stock_before_order が存在する場合:')
    console.log('   → FIX_STOCK_TRIGGER.md の手順に従ってトリガーを更新してください\n')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
  }
}

await checkTriggers()
