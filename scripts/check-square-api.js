#!/usr/bin/env node

/**
 * Square APIで決済状況を直接確認するスクリプト
 * 
 * 使い方:
 * node scripts/check-square-api.js
 */

import pkg from 'square'
const { Client, Environment } = pkg
import 'dotenv/config'

// 環境変数から設定を読み込み
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const IS_SANDBOX = SQUARE_ENVIRONMENT === 'sandbox'

const SQUARE_ACCESS_TOKEN = IS_SANDBOX 
  ? process.env.SQUARE_SANDBOX_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN
  : process.env.SQUARE_ACCESS_TOKEN

const SQUARE_LOCATION_ID = IS_SANDBOX
  ? process.env.SQUARE_SANDBOX_LOCATION_ID || process.env.SQUARE_LOCATION_ID
  : process.env.SQUARE_LOCATION_ID

if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
  console.error('❌ エラー: Square認証情報が設定されていません')
  console.error('以下の環境変数を.envファイルに設定してください:')
  console.error('  - SQUARE_ACCESS_TOKEN (または SQUARE_SANDBOX_ACCESS_TOKEN)')
  console.error('  - SQUARE_LOCATION_ID (または SQUARE_SANDBOX_LOCATION_ID)')
  console.error('  - SQUARE_ENVIRONMENT (sandbox または production)')
  process.exit(1)
}

console.log(`🔧 環境: ${SQUARE_ENVIRONMENT.toUpperCase()}`)
console.log(`📍 ロケーションID: ${SQUARE_LOCATION_ID}\n`)

// Square クライアントを初期化
const client = new Client({
  accessToken: SQUARE_ACCESS_TOKEN,
  environment: IS_SANDBOX ? 'sandbox' : 'production',
})

async function checkSquareOrders() {
  console.log('🔍 Square APIで注文を確認中...\n')
  
  try {
    // 最近の注文を取得
    const response = await client.ordersApi.searchOrders({
      locationIds: [SQUARE_LOCATION_ID],
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      },
      limit: 10
    })
    
    if (!response.result.orders || response.result.orders.length === 0) {
      console.log('📭 Square上に注文が見つかりませんでした\n')
      console.log('💡 これは正常な状態です:')
      console.log('   • まだサンドボックスで決済を完了していない場合')
      console.log('   • 決済リンクを作成しただけで、実際に決済していない場合')
      return
    }
    
    console.log(`✅ 見つかった注文: ${response.result.orders.length}件\n`)
    console.log('━'.repeat(80))
    
    response.result.orders.forEach((order, index) => {
      console.log(`\n${index + 1}. 注文ID: ${order.id}`)
      console.log(`   状態: ${order.state}`)
      console.log(`   合計金額: ${order.totalMoney ? `${order.totalMoney.amount / 100} ${order.totalMoney.currency}` : '不明'}`)
      console.log(`   作成日時: ${new Date(order.createdAt).toLocaleString('ja-JP')}`)
      console.log(`   更新日時: ${new Date(order.updatedAt).toLocaleString('ja-JP')}`)
      
      if (order.lineItems && order.lineItems.length > 0) {
        console.log(`   商品:`)
        order.lineItems.forEach(item => {
          console.log(`     - ${item.name} × ${item.quantity}`)
        })
      }
      
      // 決済情報
      if (order.tenders && order.tenders.length > 0) {
        console.log(`   決済情報:`)
        order.tenders.forEach(tender => {
          console.log(`     - タイプ: ${tender.type}`)
          console.log(`     - 状態: ${tender.cardDetails?.status || 'N/A'}`)
          console.log(`     - 金額: ${tender.amountMoney.amount / 100} ${tender.amountMoney.currency}`)
        })
      }
    })
    
    console.log('\n' + '━'.repeat(80))
    
  } catch (error) {
    console.error('❌ Square APIエラー:', error.message)
    if (error.errors) {
      console.error('詳細:', JSON.stringify(error.errors, null, 2))
    }
    process.exit(1)
  }
}

async function checkPaymentLinks() {
  console.log('\n🔗 Payment Linksを確認中...\n')
  
  try {
    const response = await client.checkoutApi.listPaymentLinks({
      limit: 10
    })
    
    if (!response.result.paymentLinks || response.result.paymentLinks.length === 0) {
      console.log('📭 Payment Linkが見つかりませんでした\n')
      return
    }
    
    console.log(`✅ 見つかったPayment Link: ${response.result.paymentLinks.length}件\n`)
    console.log('━'.repeat(80))
    
    response.result.paymentLinks.forEach((link, index) => {
      console.log(`\n${index + 1}. Payment Link ID: ${link.id}`)
      console.log(`   URL: ${link.url}`)
      console.log(`   注文ID: ${link.orderId || 'なし'}`)
      console.log(`   作成日時: ${new Date(link.createdAt).toLocaleString('ja-JP')}`)
      console.log(`   更新日時: ${new Date(link.updatedAt).toLocaleString('ja-JP')}`)
      
      if (link.checkoutOptions) {
        console.log(`   チェックアウト設定:`)
        console.log(`     - リダイレクトURL: ${link.checkoutOptions.redirectUrl || 'なし'}`)
      }
    })
    
    console.log('\n' + '━'.repeat(80))
    
  } catch (error) {
    console.error('❌ Payment Links取得エラー:', error.message)
    if (error.errors) {
      console.error('詳細:', JSON.stringify(error.errors, null, 2))
    }
  }
}

async function checkPayments() {
  console.log('\n💳 決済履歴を確認中...\n')
  
  try {
    const response = await client.paymentsApi.listPayments({
      locationId: SQUARE_LOCATION_ID,
      limit: 10
    })
    
    if (!response.result.payments || response.result.payments.length === 0) {
      console.log('📭 決済履歴が見つかりませんでした\n')
      console.log('💡 これは以下の理由が考えられます:')
      console.log('   • まだ決済が完了していない')
      console.log('   • サンドボックス環境でテストカードで決済していない')
      return
    }
    
    console.log(`✅ 見つかった決済: ${response.result.payments.length}件\n`)
    console.log('━'.repeat(80))
    
    response.result.payments.forEach((payment, index) => {
      const statusEmoji = {
        'COMPLETED': '✅',
        'APPROVED': '✅',
        'PENDING': '⏳',
        'CANCELED': '❌',
        'FAILED': '❌'
      }[payment.status] || '❓'
      
      console.log(`\n${index + 1}. ${statusEmoji} 決済ID: ${payment.id}`)
      console.log(`   状態: ${payment.status}`)
      console.log(`   金額: ${payment.amountMoney.amount / 100} ${payment.amountMoney.currency}`)
      console.log(`   注文ID: ${payment.orderId || 'なし'}`)
      console.log(`   作成日時: ${new Date(payment.createdAt).toLocaleString('ja-JP')}`)
      console.log(`   更新日時: ${new Date(payment.updatedAt).toLocaleString('ja-JP')}`)
      
      if (payment.cardDetails) {
        console.log(`   カード情報:`)
        console.log(`     - ステータス: ${payment.cardDetails.status}`)
        console.log(`     - カード: ${payment.cardDetails.card?.cardBrand || 'N/A'} ****${payment.cardDetails.card?.last4 || 'N/A'}`)
      }
    })
    
    console.log('\n' + '━'.repeat(80))
    
  } catch (error) {
    console.error('❌ 決済履歴取得エラー:', error.message)
    if (error.errors) {
      console.error('詳細:', JSON.stringify(error.errors, null, 2))
    }
  }
}

// メイン実行
async function main() {
  console.log('🏪 Square サンドボックス決済確認\n')
  console.log('━'.repeat(80))
  
  await checkSquareOrders()
  await checkPaymentLinks()
  await checkPayments()
  
  console.log('\n✨ 確認完了！\n')
  console.log('💡 ヒント:')
  console.log('   • Squareダッシュボード: https://squareup.com/dashboard')
  console.log('   • サンドボックス環境でテストカードを使用してください')
  console.log('   • カード番号: 4111 1111 1111 1111')
  console.log('   • CVV: 111')
  console.log('   • 有効期限: 任意の未来日（例: 12/25）')
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
