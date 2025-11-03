#!/usr/bin/env node

/**
 * Square サンドボックス決済確認スクリプト
 * 
 * 使い方:
 * node scripts/check-square-payments.js
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// Supabaseクライアントを初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: VITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを.envファイルに設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSquarePayments() {
  console.log('🔍 Square決済（サンドボックス）の確認を開始します...\n')
  
  try {
    // 最新のSquare決済注文を取得（過去24時間）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_method', 'square')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      throw error
    }
    
    if (!orders || orders.length === 0) {
      console.log('📭 過去24時間以内のSquare決済注文はありません\n')
      console.log('💡 ヒント:')
      console.log('  1. アプリで商品を購入してSquare決済を試してください')
      console.log('  2. テストカード: 4111 1111 1111 1111 (CVV: 111)')
      return
    }
    
    console.log(`📦 見つかった注文: ${orders.length}件\n`)
    console.log('━'.repeat(80))
    
    // 注文をステータス別に分類
    const statusGroups = {
      'pending_payment': [],
      'paid': [],
      'completed': [],
      'cancelled': [],
      'other': []
    }
    
    orders.forEach(order => {
      const status = order.status || 'other'
      if (statusGroups[status]) {
        statusGroups[status].push(order)
      } else {
        statusGroups.other.push(order)
      }
    })
    
    // 各注文の詳細を表示
    orders.forEach((order, index) => {
      const statusEmoji = {
        'pending_payment': '⏳',
        'paid': '✅',
        'completed': '📦',
        'cancelled': '❌'
      }[order.status] || '❓'
      
      console.log(`\n${index + 1}. ${statusEmoji} 注文番号: ${order.order_number}`)
      console.log(`   商品名: ${order.product_name}`)
      console.log(`   金額: ¥${order.price?.toLocaleString()}`)
      console.log(`   顧客名: ${order.customer_name}`)
      console.log(`   メール: ${order.email}`)
      console.log(`   ステータス: ${order.status}`)
      console.log(`   決済ステータス: ${order.payment_status || '未設定'}`)
      console.log(`   Square注文ID: ${order.square_order_id || 'なし'}`)
      console.log(`   Square決済リンクID: ${order.square_payment_link_id || 'なし'}`)
      console.log(`   作成日時: ${new Date(order.created_at).toLocaleString('ja-JP')}`)
      console.log(`   更新日時: ${new Date(order.updated_at).toLocaleString('ja-JP')}`)
    })
    
    console.log('\n' + '━'.repeat(80))
    console.log('\n📊 ステータス別サマリー:')
    console.log(`   ⏳ 決済待ち (pending_payment): ${statusGroups.pending_payment.length}件`)
    console.log(`   ✅ 決済完了 (paid): ${statusGroups.paid.length}件`)
    console.log(`   📦 発送完了 (completed): ${statusGroups.completed.length}件`)
    console.log(`   ❌ キャンセル (cancelled): ${statusGroups.cancelled.length}件`)
    if (statusGroups.other.length > 0) {
      console.log(`   ❓ その他: ${statusGroups.other.length}件`)
    }
    
    // 決済待ちの注文がある場合の警告
    if (statusGroups.pending_payment.length > 0) {
      console.log('\n⚠️  決済待ちの注文があります')
      console.log('   これらの注文は以下のいずれかの状態です:')
      console.log('   • 顧客が決済画面を開いたが、まだ決済していない')
      console.log('   • 決済は完了したが、Webhookがまだ受信されていない')
      console.log('   • 決済に失敗した')
    }
    
    // 成功した決済の数
    const successfulPayments = statusGroups.paid.length + statusGroups.completed.length
    if (successfulPayments > 0) {
      console.log(`\n🎉 ${successfulPayments}件の決済が成功しています！`)
    }
    
    console.log('\n━'.repeat(80))
    console.log('\n💡 次のステップ:')
    console.log('   1. Squareダッシュボードで決済を確認:')
    console.log('      https://squareup.com/dashboard/sales/transactions')
    console.log('   2. Webhookログを確認（Supabase Dashboard）')
    console.log('   3. テスト決済を行う場合:')
    console.log('      • カード番号: 4111 1111 1111 1111')
    console.log('      • CVV: 111')
    console.log('      • 有効期限: 任意の未来日（例: 12/25）')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    console.error('詳細:', error)
    process.exit(1)
  }
}

// 特定の注文番号で検索する関数
async function checkSpecificOrder(orderNumber) {
  console.log(`🔍 注文番号 "${orderNumber}" を検索中...\n`)
  
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ 注文が見つかりませんでした')
        return
      }
      throw error
    }
    
    console.log('✅ 注文が見つかりました\n')
    console.log('━'.repeat(80))
    console.log(`注文番号: ${order.order_number}`)
    console.log(`商品名: ${order.product_name}`)
    console.log(`金額: ¥${order.price?.toLocaleString()}`)
    console.log(`顧客名: ${order.customer_name}`)
    console.log(`メール: ${order.email}`)
    console.log(`ステータス: ${order.status}`)
    console.log(`決済ステータス: ${order.payment_status || '未設定'}`)
    console.log(`Square注文ID: ${order.square_order_id || 'なし'}`)
    console.log(`作成日時: ${new Date(order.created_at).toLocaleString('ja-JP')}`)
    console.log(`更新日時: ${new Date(order.updated_at).toLocaleString('ja-JP')}`)
    console.log('━'.repeat(80))
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }
}

// コマンドライン引数を処理
const args = process.argv.slice(2)
if (args.length > 0) {
  checkSpecificOrder(args[0])
} else {
  checkSquarePayments()
}
