// 現在のトリガー関数の定義を確認
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTriggerDefinition() {
  try {
    console.log('🔍 トリガー関数の定義を確認中...\n')
    
    // トリガー関数の定義を取得
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'check_and_decrease_stock_on_order';
      `
    })
    
    if (error) {
      // RPCがない場合は直接SQLで取得を試みる
      console.log('⚠️  RPC経由での取得に失敗。管理コンソールで以下のSQLを実行してください:\n')
      console.log('```sql')
      console.log(`SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'check_and_decrease_stock_on_order';`)
      console.log('```\n')
      
      // トリガーの存在確認
      console.log('📋 トリガーの存在確認:\n')
      console.log('```sql')
      console.log(`SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_check_and_decrease_stock_on_order';`)
      console.log('```\n')
      
      console.log('💡 Supabase ダッシュボードで実行してください:')
      console.log('   1. Supabaseダッシュボードを開く')
      console.log('   2. SQL Editor を開く')
      console.log('   3. 上記のSQLを実行')
      console.log('   4. 結果を確認\n')
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ トリガー関数が見つかりました\n')
      console.log('関数名:', data[0].function_name)
      console.log('\n関数定義:')
      console.log('─'.repeat(80))
      console.log(data[0].definition)
      console.log('─'.repeat(80))
    } else {
      console.log('❌ トリガー関数が見つかりません')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

checkTriggerDefinition()
