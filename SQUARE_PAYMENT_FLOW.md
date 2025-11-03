# Square決済完了フローの修正と改善

## 概要

Square決済完了時に以下の処理を自動的に行うフローを実装しました：

1. ✅ 注文ステータスを`paid`に更新
2. ✅ Square注文IDとPayment Link IDをDBに保存
3. ✅ 在庫を自動減少
4. ✅ 管理者と顧客にメール送信

## アーキテクチャ

### フロー図

```
[ユーザー] 
   ↓ 
[カート決済画面] 
   ↓ 
[supabase/functions/square-checkout] ← Supabaseにorders作成(status: pending_payment)
   ↓ 
[Squareホスト決済ページ]
   ↓ 決済完了
[決済完了画面 /payment-complete]
   ↓
[supabase/functions/square-payment-complete] 
   ↓
   ├─ orders更新 (status: paid, square_order_id, square_payment_link_id)
   ├─ 在庫減少 (decrease_product_stock関数)
   ├─ メール送信 (管理者)
   └─ メール送信 (顧客)
```

### 主な変更点

#### 1. **square-checkout関数の修正**
- カート注文番号(`cartOrderNumber`)をメタデータに追加
- リダイレクトURLに注文番号をクエリパラメータとして含める

#### 2. **square-payment-complete関数の新規作成**
決済完了時に以下を実行：
- カート注文番号で全注文を取得
- 各注文のステータスを`paid`に更新
- Square注文IDとPayment Link IDを保存
- 在庫を減少（SQL関数呼び出し）
- 管理者と顧客にメール送信

#### 3. **decrease_product_stock SQL関数の新規作成**
安全に在庫を減らすための関数：
```sql
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_id UUID,
  quantity_to_decrease INTEGER
)
RETURNS void
```

#### 4. **PaymentComplete.vueの修正**
- localStorageから注文情報を取得
- `square-payment-complete`関数を呼び出して注文を確定
- カートをクリア

#### 5. **CartCheckout.vueの修正**
- `cartOrderNumber`をlocalStorageに保存

## デプロイ手順

### 1. SQL関数のデプロイ

Supabase Dashboard → SQL Editor で以下のSQLを実行：

```sql
-- sql/decrease_product_stock.sqlの内容をコピーして実行
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_id UUID,
  quantity_to_decrease INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE succulents
  SET 
    quantity = GREATEST(0, quantity - quantity_to_decrease),
    updated_at = NOW()
  WHERE id = product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrease_product_stock TO service_role;
GRANT EXECUTE ON FUNCTION decrease_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION decrease_product_stock TO anon;
```

### 2. Edge Functionsのデプロイ

```bash
# square-checkout関数を再デプロイ
npx supabase functions deploy square-checkout

# square-payment-complete関数をデプロイ
npx supabase functions deploy square-payment-complete
```

### 3. フロントエンドのビルド・デプロイ

```bash
npm run build
# Vercelなどにデプロイ
```

## テスト手順

### 1. サンドボックス環境でテスト

1. `.env`でサンドボックス環境を有効化（既存の設定）
2. カート決済を実行
3. テストカードで決済完了
4. 決済完了画面が表示されることを確認

### 2. データベースの確認

```bash
node scripts/check-square-payments.js
```

以下が確認できること：
- ✅ `status: paid`に更新されている
- ✅ `square_order_id`が保存されている
- ✅ `square_payment_link_id`が保存されている
- ✅ 在庫が減っている（succulentsテーブル）

### 3. メールの確認

- 管理者メール（k3.ns.208_b50@icloud.com）に注文確認メールが届く
- 顧客メールに注文確認メールが届く

## トラブルシューティング

### 在庫が減っていない場合

1. **SQL関数が作成されているか確認**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'decrease_product_stock';
   ```

2. **Edge Functionのログを確認**
   Supabase Dashboard → Functions → square-payment-complete → Logs

3. **手動で在庫を減らす**
   ```sql
   UPDATE succulents 
   SET quantity = quantity - 1 
   WHERE id = 'product-id';
   ```

### square_order_idが保存されていない場合

1. **CartCheckout.vueの注文更新処理を確認**
   - ブラウザの開発者ツール → Network → orders（UPDATE）を確認

2. **手動で更新**
   ```sql
   UPDATE orders 
   SET 
     square_order_id = 'order-id',
     square_payment_link_id = 'link-id'
   WHERE order_number LIKE 'CART%';
   ```

### メールが届かない場合

1. **Mailgun設定を確認**
   - `.env`の`MAILGUN_API_KEY`と`MAILGUN_DOMAIN`
   - Mailgunダッシュボードでドメイン認証済みか確認

2. **Edge Functionのログを確認**
   - メール送信のエラーログがないか確認

## 本番環境への移行

1. **環境変数の切り替え**
   ```bash
   # .envファイルで本番環境を有効化
   SQUARE_ENVIRONMENT=production
   VITE_SQUARE_APPLICATION_ID=sq0idp-...（本番用）
   VITE_SQUARE_LOCATION_ID=LH2M8C6XBCQPX
   ```

2. **Supabase Edge Functionsの環境変数を更新**
   ```bash
   npx supabase secrets set SQUARE_ENVIRONMENT=production
   npx supabase secrets set SQUARE_ACCESS_TOKEN=本番用トークン
   npx supabase secrets set SQUARE_LOCATION_ID=LH2M8C6XBCQPX
   ```

3. **Webhook設定（オプション）**
   - Square Developer Dashboard → Webhooks
   - Webhook URLを設定: `https://[project-id].supabase.co/functions/v1/square-webhook`
   - イベント: `payment.created`, `payment.updated`

## 注意事項

- ⚠️ サンドボックス環境ではWebhookが自動的に呼ばれないため、決済完了画面での処理が重要
- ⚠️ 本番環境ではWebhookも設定して二重チェックを推奨
- ⚠️ 在庫が0を下回らないようにSQL関数で`GREATEST(0, quantity - ...)`を使用
- ⚠️ メール送信が失敗してもエラーにせず、ログに記録のみ

## 改善履歴

### 2025-10-25
- ✅ square-payment-complete Edge Function新規作成
- ✅ decrease_product_stock SQL関数作成
- ✅ PaymentComplete.vue修正（注文確定処理追加）
- ✅ CartCheckout.vue修正（cartOrderNumber保存）
- ✅ square-checkout関数修正（メタデータ追加）
- ✅ 在庫減少・メール送信の自動化

## 関連ファイル

- `supabase/functions/square-checkout/index.ts`
- `supabase/functions/square-payment-complete/index.ts`
- `supabase/functions/square-webhook/index.ts`
- `src/components/PaymentComplete.vue`
- `src/components/CartCheckout.vue`
- `sql/decrease_product_stock.sql`
- `scripts/check-square-payments.js`
