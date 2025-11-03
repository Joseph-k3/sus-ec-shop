# Square決済フロー実装ガイド

## 実装完了した内容

### 1. Vue側（フロントエンド）✅
- **CartCheckout.vue**: 決済方法選択UI追加（Square/銀行振込）
- **PaymentComplete.vue**: Square決済完了後のサンクス画面
- **squarePayment.js**: Square API呼び出しヘルパー関数
- **ルーター**: `/payment-complete`パス追加

### 2. Supabase Edge Functions ✅
- **square-checkout/index.ts**: Square Checkout API呼び出し
- **square-webhook/index.ts**: Webhook受信・在庫減少・メール送信
- **send-email-mailgun/index.ts**: Mailgunメール送信

### 3. データベース ✅
- **マイグレーション**: Square用カラム追加（square_order_id, payment_status等）

## セットアップ手順

### ステップ1: Square Sandboxの設定

1. **Square Developer Dashboard**にアクセス
   - https://developer.squareup.com/apps

2. **Sandbox Access Token**を取得
   - Applications → あなたのアプリ → Credentials → Sandbox
   - "Sandbox Access Token"をコピー

3. **.envファイルを更新**
```bash
# .envファイルの該当行を更新
SQUARE_ACCESS_TOKEN=あなたのSandboxアクセストークン
```

### ステップ2: データベースマイグレーション

```bash
# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref hcqgfdyentwazmyikvtl

# マイグレーションを実行
supabase db push
```

または、Supabase Dashboardから手動実行：
1. https://supabase.com/dashboard/project/hcqgfdyentwazmyikvtl/editor
2. SQL Editorで`supabase/migrations/20250123_add_square_payment_columns.sql`の内容を実行

### ステップ3: Edge Functionsのデプロイ

```bash
# square-checkoutをデプロイ
supabase functions deploy square-checkout

# square-webhookをデプロイ
supabase functions deploy square-webhook

# send-email-mailgunをデプロイ（まだの場合）
supabase functions deploy send-email-mailgun
```

### ステップ4: 環境変数の設定

Supabase Dashboardで環境変数を設定：
https://supabase.com/dashboard/project/hcqgfdyentwazmyikvtl/settings/functions

必要な環境変数：
```
SQUARE_ACCESS_TOKEN=あなたのSandboxアクセストークン
SQUARE_LOCATION_ID=L2GETRYTNPK6E
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=任意の署名キー（本番で使用）

MAILGUN_API_KEY=あなたのMailgun APIキー
MAILGUN_DOMAIN=あなたのMailgunドメイン
MAILGUN_FROM_EMAIL=noreply@sus-ec-shop.com

SUPABASE_URL=https://hcqgfdyentwazmyikvtl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=あなたのService Role Key
```

または、CLIで一括設定：
```bash
supabase secrets set SQUARE_ACCESS_TOKEN=あなたのトークン
supabase secrets set SQUARE_LOCATION_ID=L2GETRYTNPK6E
supabase secrets set SQUARE_ENVIRONMENT=sandbox
supabase secrets set MAILGUN_API_KEY=あなたのMailgun APIキー
supabase secrets set MAILGUN_DOMAIN=あなたのドメイン
supabase secrets set MAILGUN_FROM_EMAIL=noreply@sus-ec-shop.com
```

### ステップ5: Webhook URLの設定

1. **Square Developer Dashboard**でWebhook URLを設定
   - https://developer.squareup.com/apps
   - あなたのアプリ → Webhooks → Add endpoint

2. **Webhook URL**を入力（Sandbox用）
```
https://hcqgfdyentwazmyikvtl.supabase.co/functions/v1/square-webhook
```

3. **購読するイベント**を選択
   - `payment.created`
   - `payment.updated`

4. **保存**をクリック

### ステップ6: 動作テスト

1. **開発サーバーを起動**
```bash
npm run dev
```

2. **テストフロー**
   - カートに商品を追加
   - チェックアウト画面で「クレジットカード決済（Square）」を選択
   - お客様情報を入力
   - 「注文を確定する」をクリック
   - Square決済ページにリダイレクト
   - Sandboxテストカード情報を入力：
     - カード番号: 4111 1111 1111 1111
     - 有効期限: 任意の未来の日付
     - CVV: 任意の3桁
   - 決済完了後、サンクス画面が表示される

3. **確認項目**
   - [ ] Square決済ページへのリダイレクト
   - [ ] 決済完了後のサンクス画面表示
   - [ ] ordersテーブルに注文が保存される
   - [ ] 在庫が減少する
   - [ ] 管理者とお客様にメールが送信される

## 決済フロー図

```
①お客様が情報入力（Vue）
         ↓
②Edge FunctionにPOST（square-checkout）
         ↓
③Square Checkout API呼び出し
         ↓
④checkout_urlをVueに返す
         ↓
⑤Square決済ページにリダイレクト
         ↓
⑥お客様がカード情報を入力
         ↓
⑦決済完了
         ↓
⑧Square Webhook → Edge Function（square-webhook）
         ↓
⑨商品在庫を減らす（ordersテーブル更新 + succulentsテーブル更新）
         ↓
⑩管理者＋お客様へメール送信（send-email-mailgun）
```

## トラブルシューティング

### Edge Functionのログ確認
```bash
# リアルタイムログ
supabase functions serve square-checkout

# 本番ログ
https://supabase.com/dashboard/project/hcqgfdyentwazmyikvtl/logs/edge-functions
```

### Webhookが動かない場合
1. Square DashboardでWebhook URLが正しいか確認
2. Edge Functionがデプロイされているか確認
3. 環境変数が設定されているか確認
4. Webhookログを確認（Square Dashboard → Webhooks → Events）

### 決済ページにリダイレクトされない場合
1. ブラウザのコンソールでエラーを確認
2. `.env`ファイルの`SQUARE_ACCESS_TOKEN`が正しいか確認
3. Edge Functionのログを確認

## 本番環境への移行

1. **Square本番環境の設定**
   - Production Application IDとAccess Tokenを取得
   - `.env`ファイルを更新（本番用の設定をコメント解除）

2. **環境変数を本番用に変更**
```bash
supabase secrets set SQUARE_ENVIRONMENT=production
supabase secrets set SQUARE_ACCESS_TOKEN=本番用トークン
supabase secrets set SQUARE_LOCATION_ID=本番用Location ID
```

3. **Webhook URLを本番用に変更**
   - Square Developer Dashboardで本番Webhook URLを設定

4. **署名検証を有効化**
   - `square-webhook/index.ts`の署名検証コードのコメントを解除
   - Webhook Signature Keyを環境変数に設定

## 参考リンク

- Square API Docs: https://developer.squareup.com/docs
- Square Checkout API: https://developer.squareup.com/docs/checkout-api/what-it-does
- Square Webhooks: https://developer.squareup.com/docs/webhooks/overview
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
