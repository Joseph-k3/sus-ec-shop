# Square Order ID 保存問題のトラブルシューティング

## 問題

決済完了後、`square_order_id`と`square_payment_link_id`がデータベースに保存されない。

## 原因の可能性

### 1. **DB更新前にリダイレクトされている**
CartCheckout.vueでDB更新を実行した直後、結果を待たずにリダイレクトしている可能性。

### 2. **注文番号のパターンマッチングが失敗**
`.ilike('order_number', '${cartOrderNumber}%')` で検索しているが、注文が見つからない可能性。

### 3. **square-checkout関数がorderIdを返していない**
Square APIの仕様変更により、`result.paymentLink?.orderId`が存在しない可能性。

## 実施した修正

### 1. CartCheckout.vueの改善
```javascript
// ✅ .select()を追加して更新結果を取得
// ✅ エラーチェックを強化
// ✅ 更新件数を確認
const updateResult = await supabase
  .from('orders')
  .update({ 
    square_order_id: checkoutResult.orderId,
    square_payment_link_id: checkoutResult.paymentLinkId
  })
  .ilike('order_number', `${cartOrderNumber}%`)
  .select()  // ← 追加

if (updateResult.error) {
  throw new Error(`注文IDの保存に失敗しました: ${updateResult.error.message}`)
}

if (!updateResult.data || updateResult.data.length === 0) {
  console.error('❌ 更新対象の注文が見つかりませんでした')
}
```

### 2. デバッグログの追加
```javascript
console.log('🔍 Square Checkout結果:', checkoutResult)
console.log('🔍 Order ID:', checkoutResult.orderId)
console.log('🔍 Payment Link ID:', checkoutResult.paymentLinkId)
console.log('🔍 DB更新結果:', updateResult)
```

### 3. square-payment-complete関数での二重保存
決済完了画面でも再度保存することで、確実性を向上。

## テスト手順

### ステップ1: ブラウザコンソールでログ確認

1. 開発サーバーを起動
   ```bash
   npm run dev
   ```

2. ブラウザの開発者ツールを開く（F12）

3. カート決済を実行

4. コンソールで以下を確認：
   ```
   🔍 Square Checkout結果: {...}
   🔍 Order ID: xxxxx
   🔍 Payment Link ID: xxxxx
   🔍 DB更新結果: {...}
   ✅ N件の注文を更新しました
   ```

### ステップ2: データベース確認

```bash
node scripts/check-square-payments.js
```

確認ポイント：
- ✅ `square_order_id`が設定されている
- ✅ `square_payment_link_id`が設定されている

### ステップ3: 問題が解決しない場合

#### A. 注文番号パターンを確認
```javascript
// ブラウザコンソールで実行
console.log('カート注文番号:', cartOrderNumber)
```

#### B. 作成された注文を確認
Supabase Dashboard → Table Editor → `orders`テーブルで、
`order_number`が`CART...`形式になっているか確認

#### C. Square APIレスポンスを確認
```javascript
// CartCheckout.vueに追加
console.log('Square API完全レスポンス:', JSON.stringify(checkoutResult, null, 2))
```

## よくある問題と解決策

### 問題1: orderIdがundefined

**原因**: Square API v35のレスポンス構造が異なる

**解決策**: Square SDK v43を使用する、またはレスポンス構造を確認
```typescript
// supabase/functions/square-checkout/index.ts
console.log('Payment Link Response:', JSON.stringify(result.paymentLink, null, 2))
```

### 問題2: 注文が見つからない

**原因**: 注文作成とDB更新の間にタイムラグがある

**解決策**: 注文作成後、少し待機してから更新
```javascript
await Promise.all(orderPromises)
await new Promise(resolve => setTimeout(resolve, 100)) // 100ms待機
const checkoutResult = await createSquareCheckout(orderData)
```

### 問題3: 更新が実行されない

**原因**: `ilike`が期待通りに動作していない

**解決策**: `like`や`eq`を試す
```javascript
// パターン1: like（大文字小文字区別あり）
.like('order_number', `${cartOrderNumber}%`)

// パターン2: 完全一致で全件更新
const { data: ordersList } = await supabase
  .from('orders')
  .select('id')
  .ilike('order_number', `${cartOrderNumber}%`)

for (const ord of ordersList) {
  await supabase
    .from('orders')
    .update({ square_order_id, square_payment_link_id })
    .eq('id', ord.id)
}
```

## 最終確認スクリプト

既存の注文にテスト値を設定して、DBアクセスが正常か確認：

```bash
node scripts/update-test-order.cjs
node scripts/check-square-payments.js
```

## 次のステップ

1. ✅ ブラウザコンソールでログ確認
2. ✅ DB更新が実行されているか確認
3. ✅ Square APIレスポンスの構造を確認
4. ✅ 必要に応じてsquare-checkout関数のログを確認
5. ✅ Supabase Dashboard → Functions → square-checkout → Logs

## 関連ファイル

- `/src/components/CartCheckout.vue` - カート決済画面
- `/src/components/PaymentComplete.vue` - 決済完了画面
- `/supabase/functions/square-checkout/index.ts` - Square決済Edge Function
- `/supabase/functions/square-payment-complete/index.ts` - 決済完了処理Edge Function
- `/scripts/check-square-payments.js` - 決済状況確認スクリプト
- `/scripts/update-test-order.cjs` - テスト用注文更新スクリプト
