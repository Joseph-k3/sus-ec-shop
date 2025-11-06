import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'

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

async function applyMigration() {
  console.log('🔧 在庫チェックトリガーを無効化します...\n')
  
  try {
    // マイグレーションSQLを読み込む
    const sqlPath = resolve(__dirname, '../supabase/migrations/20251106_disable_stock_trigger.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    console.log('📄 実行するSQL:')
    console.log('─'.repeat(80))
    console.log(sql)
    console.log('─'.repeat(80))
    console.log('')
    
    // SQLを実行（Supabaseのanon keyでは実行できない可能性があるため、注意が必要）
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.error('❌ エラー:', error.message)
      console.log('\n⚠️  注意: このスクリプトはSupabase管理者権限が必要です')
      console.log('📝 代わりに、Supabase Dashboard > SQL Editor で以下を実行してください:\n')
      console.log(sql)
      return false
    }
    
    console.log('✅ マイグレーションが正常に適用されました')
    return true
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    console.log('\n⚠️  このスクリプトはSupabase管理者権限が必要です')
    console.log('📝 Supabase Dashboard > SQL Editor で以下のSQLを実行してください:\n')
    
    const sqlPath = resolve(__dirname, '../supabase/migrations/20251106_disable_stock_trigger.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    console.log(sql)
    return false
  }
}

console.log('🚀 在庫チェックトリガー無効化スクリプト\n')
await applyMigration()
