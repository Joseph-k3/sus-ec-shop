#!/usr/bin/env node

/**
 * Square APIで決済状況を直接確認するスクリプト (CommonJS版)
 * 
 * 使い方:
 * node scripts/check-square-api-cjs.js
 */

const { SquareClient, SquareEnvironment } = require('square')
require('dotenv/config')

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
  console.error('❌ エラー: 環境変数が設定されていません')
  console.error('必要な変数:')
  console.error('  - SQUARE_SANDBOX_ACCESS_TOKEN または SQUARE_ACCESS_TOKEN')
  console.error('  - SQUARE_SANDBOX_LOCATION_ID または SQUARE_LOCATION_ID')
  console.error('  - SQUARE_ENVIRONMENT (オプション、デフォルト: sandbox)')
  process.exit(1)
}

console.log(`🔧 環境: ${SQUARE_ENVIRONMENT.toUpperCase()}`)
console.log(`📍 ロケーションID: ${SQUARE_LOCATION_ID}\n`)

// Square クライアントを初期化
const client = new SquareClient({
  accessToken: SQUARE_ACCESS_TOKEN,
  environment: IS_SANDBOX ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
})

async function checkSquareOrders() {
  console.log('🔍 Square APIで注文を確認中...\n')

  try {
    const { result } = await client.ordersApi.searchOrders({
      locationIds: [SQUARE_LOCATION_ID],
      limit: 10,
      returnEntries: false,
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      }
    })

    if (!result.orders || result.orders.length === 0) {
      console.log('📦 注文が見つかりませんでした\n')
      return
    }

    console.log(`📦 見つかった注文: ${result.orders.length}件\n`)
    console.log('━'.repeat(80))

    result.orders.forEach((order, index) => {
      console.log(`\n${index + 1}. 注文ID: ${order.id}`)
      console.log(`   状態: ${order.state || 'N/A'}`)
      console.log(`   作成日時: ${new Date(order.createdAt).toLocaleString('ja-JP')}`)
      
      if (order.totalMoney) {
        const amount = order.totalMoney.amount / 100
        console.log(`   合計金額: ¥${amount.toLocaleString()}`)
      }
      
      if (order.lineItems && order.lineItems.length > 0) {
        console.log(`   商品:`)
        order.lineItems.forEach(item => {
          console.log(`     - ${item.name || 'N/A'} x ${item.quantity || 1}`)
        })
      }
    })

    console.log('\n' + '━'.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ 注文の取得に失敗しました:', error.message)
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.category}: ${err.detail}`)
      })
    }
  }
}

async function checkSquarePayments() {
  console.log('💳 Square APIで決済を確認中...\n')

  try {
    const { result } = await client.paymentsApi.listPayments({
      locationId: SQUARE_LOCATION_ID,
      limit: 10,
    })

    if (!result.payments || result.payments.length === 0) {
      console.log('💳 決済が見つかりませんでした\n')
      return
    }

    console.log(`💳 見つかった決済: ${result.payments.length}件\n`)
    console.log('━'.repeat(80))

    result.payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. 決済ID: ${payment.id}`)
      console.log(`   状態: ${payment.status || 'N/A'}`)
      console.log(`   作成日時: ${new Date(payment.createdAt).toLocaleString('ja-JP')}`)
      
      if (payment.amountMoney) {
        const amount = payment.amountMoney.amount / 100
        console.log(`   金額: ¥${amount.toLocaleString()}`)
      }
      
      if (payment.orderId) {
        console.log(`   関連注文ID: ${payment.orderId}`)
      }
      
      if (payment.receiptUrl) {
        console.log(`   レシートURL: ${payment.receiptUrl}`)
      }
    })

    console.log('\n' + '━'.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ 決済の取得に失敗しました:', error.message)
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.category}: ${err.detail}`)
      })
    }
  }
}

async function checkPaymentLinks() {
  console.log('🔗 Square APIで決済リンクを確認中...\n')

  try {
    const { result } = await client.checkoutApi.listPaymentLinks({
      limit: 10
    })

    if (!result.paymentLinks || result.paymentLinks.length === 0) {
      console.log('🔗 決済リンクが見つかりませんでした\n')
      return
    }

    console.log(`🔗 見つかった決済リンク: ${result.paymentLinks.length}件\n`)
    console.log('━'.repeat(80))

    result.paymentLinks.forEach((link, index) => {
      console.log(`\n${index + 1}. リンクID: ${link.id}`)
      console.log(`   URL: ${link.url || 'N/A'}`)
      console.log(`   作成日時: ${new Date(link.createdAt).toLocaleString('ja-JP')}`)
      
      if (link.checkoutOptions?.redirectUrl) {
        console.log(`   リダイレクトURL: ${link.checkoutOptions.redirectUrl}`)
      }
      
      if (link.order) {
        console.log(`   注文情報:`)
        if (link.order.lineItems && link.order.lineItems.length > 0) {
          link.order.lineItems.forEach(item => {
            console.log(`     - ${item.name || 'N/A'} x ${item.quantity || 1}`)
          })
        }
      }
    })

    console.log('\n' + '━'.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ 決済リンクの取得に失敗しました:', error.message)
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.category}: ${err.detail}`)
      })
    }
  }
}

async function main() {
  console.log('🔍 Square決済状況の確認を開始します...\n')
  console.log('━'.repeat(80) + '\n')

  await checkSquareOrders()
  await checkSquarePayments()
  await checkPaymentLinks()

  console.log('✅ 確認が完了しました！\n')
  console.log('💡 次のステップ:')
  console.log('   1. Squareダッシュボードで詳細を確認:')
  console.log('      https://squareup.com/dashboard/sales/transactions')
  console.log('   2. テスト決済を行う場合:')
  console.log('      • カード番号: 4111 1111 1111 1111')
  console.log('      • CVV: 111')
  console.log('      • 有効期限: 任意の未来日（例: 12/25）')
}

main().catch(error => {
  console.error('\n❌ エラーが発生しました:', error.message)
  console.error(error.stack)
  process.exit(1)
})
