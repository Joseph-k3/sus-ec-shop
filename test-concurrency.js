// 在庫競合状態のテストスクリプト
// このスクリプトは修正後のコードが競合状態を防げているかテストします

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key'
const supabase = createClient(supabaseUrl, supabaseKey)

// テスト用の商品IDを設定（実際の商品IDに変更してください）
const TEST_PRODUCT_ID = 'test-product-id'

async function createTestProduct() {
  console.log('テスト用商品を作成中...')
  
  // まず既存のテスト商品を削除
  await supabase
    .from('succulents')
    .delete()
    .eq('id', TEST_PRODUCT_ID)
  
  // 在庫1個のテスト商品を作成
  const { data, error } = await supabase
    .from('succulents')
    .insert([{
      id: TEST_PRODUCT_ID,
      name: 'テスト商品（在庫競合テスト用）',
      description: '在庫競合テスト用の商品です',
      price: 1000,
      quantity: 1,
      image: '/logo.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
  
  if (error) {
    console.error('テスト商品作成エラー:', error)
    return false
  }
  
  console.log('テスト商品作成完了:', data)
  return true
}

async function simulateConcurrentPurchase() {
  console.log('同時購入のシミュレーション開始...')
  
  // 2つの同時購入をシミュレート
  const purchase1 = attemptPurchase('購入者A')
  const purchase2 = attemptPurchase('購入者B')
  
  const results = await Promise.allSettled([purchase1, purchase2])
  
  console.log('=== テスト結果 ===')
  results.forEach((result, index) => {
    const buyer = index === 0 ? '購入者A' : '購入者B'
    if (result.status === 'fulfilled') {
      console.log(`✅ ${buyer}: 購入成功`)
    } else {
      console.log(`❌ ${buyer}: 購入失敗 - ${result.reason}`)
    }
  })
  
  // 最終的な在庫を確認
  const { data: finalStock } = await supabase
    .from('succulents')
    .select('quantity')
    .eq('id', TEST_PRODUCT_ID)
    .single()
  
  console.log(`最終在庫: ${finalStock?.quantity || 0}個`)
  
  // 期待値チェック
  const successCount = results.filter(r => r.status === 'fulfilled').length
  const expectedStock = 1 - successCount
  
  if (finalStock?.quantity === expectedStock) {
    console.log('✅ テスト成功: 在庫数が期待値と一致しています')
    return true
  } else {
    console.log('❌ テスト失敗: 在庫数が期待値と異なります')
    console.log(`期待値: ${expectedStock}個, 実際: ${finalStock?.quantity}個`)
    return false
  }
}

async function attemptPurchase(buyerName) {
  try {
    console.log(`${buyerName}: 購入試行開始`)
    
    // 修正後のロジック：原子的在庫減少操作
    const { data: stockUpdateResult, error: stockUpdateError } = await supabase
      .from('succulents')
      .update({ 
        quantity: supabase.sql`quantity - 1`  // SQLレベルでの原子的減算
      })
      .eq('id', TEST_PRODUCT_ID)
      .gte('quantity', 1)  // 在庫が1以上の場合のみ更新
      .select('quantity')
      .single()

    if (stockUpdateError) {
      throw new Error(`在庫更新エラー: ${stockUpdateError.message}`)
    }

    // 更新された行がない場合（在庫不足）
    if (!stockUpdateResult) {
      throw new Error('在庫が不足しています')
    }
    
    console.log(`${buyerName}: 在庫減少成功 (残り: ${stockUpdateResult.quantity}個)`)
    
    // ここで注文作成処理をシミュレート（省略）
    // 実際のアプリでは注文をordersテーブルに挿入
    
    return true
  } catch (error) {
    console.log(`${buyerName}: 購入失敗 - ${error.message}`)
    throw error.message
  }
}

async function cleanup() {
  console.log('テスト用データをクリーンアップ中...')
  await supabase
    .from('succulents')
    .delete()
    .eq('id', TEST_PRODUCT_ID)
  console.log('クリーンアップ完了')
}

async function runTest() {
  try {
    console.log('=== 在庫競合状態テスト開始 ===')
    
    // 1. テスト商品作成
    const created = await createTestProduct()
    if (!created) {
      console.log('テスト商品の作成に失敗しました')
      return
    }
    
    // 2. 同時購入テスト
    const testPassed = await simulateConcurrentPurchase()
    
    // 3. クリーンアップ
    await cleanup()
    
    console.log('=== テスト完了 ===')
    if (testPassed) {
      console.log('🎉 すべてのテストが成功しました！競合状態は解消されています。')
    } else {
      console.log('⚠️  テストが失敗しました。まだ競合状態の問題があります。')
    }
    
  } catch (error) {
    console.error('テスト実行エラー:', error)
    await cleanup()
  }
}

// テスト実行
runTest()
