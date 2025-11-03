# Square決済 テストモード設定ガイド

## 概要
Squareのサンドボックス環境を使用することで、実際の決済を行わずに決済フローをテストできます。

## 1. Squareサンドボックスアカウントの作成

1. [Square Developer Portal](https://developer.squareup.com/)にアクセス
2. 「Sign Up」または「Log In」でアカウントを作成/ログイン
3. 左サイドバーから「Applications」を選択
4. テスト用アプリケーションを作成または選択

## 2. サンドボックス認証情報の取得

### Supabase Edge Functionの環境変数設定

サンドボックス用の環境変数を追加：

```bash
# Square Sandbox用の認証情報
supabase secrets set SQUARE_SANDBOX_ACCESS_TOKEN="YOUR_SANDBOX_ACCESS_TOKEN"
supabase secrets set SQUARE_SANDBOX_LOCATION_ID="YOUR_SANDBOX_LOCATION_ID"
supabase secrets set SQUARE_ENVIRONMENT="sandbox"
```

### 環境変数の取得方法

1. Square Developer Portalにログイン
2. 「Applications」→ 対象アプリケーションを選択
3. 「Sandbox」タブをクリック
4. 以下の情報をコピー：
   - **Sandbox Access Token**: アクセストークン
   - **Sandbox Application ID**: アプリケーションID
   - **Location ID**: ロケーションID（Locationsページから取得）

## 3. Edge Functionの修正（テストモード対応）

`supabase/functions/square-checkout/index.ts`を以下のように修正：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client, Environment } from 'https://esm.sh/@square/square@29.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数から設定を取得
    const environment = Deno.env.get('SQUARE_ENVIRONMENT') || 'production'
    const isSandbox = environment === 'sandbox'
    
    // サンドボックスまたは本番環境の認証情報を使用
    const accessToken = isSandbox 
      ? Deno.env.get('SQUARE_SANDBOX_ACCESS_TOKEN')
      : Deno.env.get('SQUARE_ACCESS_TOKEN')
    
    const locationId = isSandbox
      ? Deno.env.get('SQUARE_SANDBOX_LOCATION_ID')
      : Deno.env.get('SQUARE_LOCATION_ID')

    if (!accessToken || !locationId) {
      throw new Error('Square credentials not configured')
    }

    // Square クライアントを初期化（環境に応じて切り替え）
    const client = new Client({
      accessToken,
      environment: isSandbox ? Environment.Sandbox : Environment.Production,
    })

    const { orderData } = await req.json()

    // Checkout APIでPayment Linkを作成
    const response = await client.checkoutApi.createPaymentLink({
      // ... 既存のコード ...
    })

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: response.result.paymentLink?.url,
        orderId: response.result.paymentLink?.orderId,
        paymentLinkId: response.result.paymentLink?.id,
        environment: isSandbox ? 'sandbox' : 'production'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Square Checkout error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
```

## 4. テストカード情報

Squareサンドボックスでは、以下のテストカードが使用できます：

### 成功するテストカード

| カード番号 | CVV | 有効期限 | 説明 |
|----------|-----|---------|------|
| 4111 1111 1111 1111 | 111 | 任意の未来日 | Visa（成功） |
| 5105 1051 0510 5100 | 111 | 任意の未来日 | Mastercard（成功） |
| 3714 496353 98431 | 1234 | 任意の未来日 | American Express（成功） |

### エラーをテストするカード

| カード番号 | CVV | 有効期限 | 結果 |
|----------|-----|---------|------|
| 4000 0000 0000 0002 | 111 | 任意の未来日 | カード拒否 |
| 4000 0000 0000 0069 | 111 | 任意の未来日 | 有効期限エラー |
| 4000 0000 0000 0127 | 111 | 任意の未来日 | CVVエラー |

## 5. .envファイルの設定

ローカル開発用の`.env`ファイルに以下を追加：

```bash
# Square サンドボックス設定（テスト用）
SQUARE_ENVIRONMENT=sandbox
SQUARE_SANDBOX_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN
SQUARE_SANDBOX_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID

# Square 本番設定（本番環境用）
# SQUARE_ENVIRONMENT=production
# SQUARE_ACCESS_TOKEN=YOUR_PRODUCTION_ACCESS_TOKEN
# SQUARE_LOCATION_ID=YOUR_PRODUCTION_LOCATION_ID
```

## 6. テスト手順

1. **サンドボックスモードに切り替え**
   ```bash
   supabase secrets set SQUARE_ENVIRONMENT="sandbox"
   ```

2. **Edge Functionを再デプロイ**
   ```bash
   supabase functions deploy square-checkout
   supabase functions deploy square-webhook
   ```

3. **アプリケーションで注文を作成**
   - 商品をカートに追加
   - Square決済を選択
   - お客様情報を入力

4. **テストカードで決済**
   - 上記のテストカード番号を使用
   - 決済を完了

5. **結果の確認**
   - Square Dashboard（Sandbox）で決済履歴を確認
   - Supabaseのordersテーブルでステータスを確認
   - メール送信のログを確認

## 7. 本番環境への切り替え

テストが完了したら、本番環境に切り替え：

```bash
supabase secrets set SQUARE_ENVIRONMENT="production"
supabase secrets set SQUARE_ACCESS_TOKEN="YOUR_PRODUCTION_ACCESS_TOKEN"
supabase secrets set SQUARE_LOCATION_ID="YOUR_PRODUCTION_LOCATION_ID"
```

## 8. トラブルシューティング

### 決済が完了しない場合

1. Square Developer Portalで認証情報を確認
2. Supabase Edge Functionのログを確認：
   ```bash
   supabase functions logs square-checkout
   ```
3. ネットワークエラーの確認（ブラウザのDevTools）

### Webhookが動作しない場合

1. Webhook URLが正しく設定されているか確認
2. Webhook署名検証をスキップ（テスト時のみ）：
   ```typescript
   // テストモードでは署名検証をスキップ
   if (environment === 'sandbox') {
     console.log('Sandbox mode: Skipping webhook signature verification')
   }
   ```

## 9. 参考リンク

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square Sandbox Testing Guide](https://developer.squareup.com/docs/testing/sandbox)
- [Square Test Values](https://developer.squareup.com/docs/testing/test-values)
- [Square Webhooks](https://developer.squareup.com/docs/webhooks/overview)

## まとめ

サンドボックス環境を使用することで：
- ✅ 実際のお金を使わずにテスト可能
- ✅ さまざまなエラーケースをシミュレーション
- ✅ 本番環境と同じAPIを使用
- ✅ 安全に開発とデバッグが可能

本番環境にデプロイする前に、必ずサンドボックスで全ての機能をテストしてください！
