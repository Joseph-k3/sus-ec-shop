# Square返金機能 実装ドキュメント

## 概要
注文管理画面でSquare決済の返金処理を実行できる機能を実装しました。

## 実装構成

### 1. Supabase Edge Function
**ファイル:** `supabase/functions/square-refund/index.ts`

**機能:**
- Square Refunds APIを使用した返金処理
- 注文ステータスの更新（`refunded`フラグ、返金情報の記録）
- 商品在庫の復元
- 管理者とお客様へのメール通知

**エンドポイント:**
```
POST /supabase/functions/v1/square-refund
```

**リクエストボディ:**
```json
{
  "orderId": "uuid",
  "reason": "返金理由（オプション）"
}
```

**レスポンス:**
```json
{
  "success": true,
  "refundId": "square_refund_id",
  "orderId": "uuid",
  "amount": 1000,
  "environment": "sandbox",
  "isTest": true
}
```

### 2. データベース更新
**ファイル:** `supabase/migrations/20250103_add_refund_columns.sql`

**追加カラム:**
- `refunded` (BOOLEAN): 返金済みフラグ
- `refund_id` (TEXT): Square返金ID
- `refund_reason` (TEXT): 返金理由
- `refunded_at` (TIMESTAMP): 返金日時
- `square_payment_id` (TEXT): Square決済ID
- `square_order_id` (TEXT): Square注文ID
- `square_payment_link_id` (TEXT): Square決済リンクID
- `payment_status` (TEXT): 決済ステータス
- `paid_at` (TIMESTAMP): 決済完了日時
- `updated_at` (TIMESTAMP): 更新日時

**実行方法:**
```bash
# Supabase CLIで実行
supabase db push

# または、Supabase Dashboardで直接SQLを実行
```

### 3. フロントエンド実装

#### 3.1 AdminOrderList.vue（新規作成）
**ファイル:** `src/components/AdminOrderList.vue`

**機能:**
- 注文一覧表示（ステータスフィルター付き）
- 返金ダイアログ（返金理由入力）
- 注文詳細表示
- リアルタイム更新

**特徴:**
- モダンなUI/UX
- モバイル対応
- エラーハンドリング
- トーストメッセージ

#### 3.2 OrderManagement.vue（既存ファイル更新）
**ファイル:** `src/components/admin/OrderManagement.vue`

**更新内容:**
- RefundButtonコンポーネントの統合
- `square_payment_id`フィールドの使用に変更
- 返金成功・エラーハンドラーの追加
- 返金済みバッジの表示

#### 3.3 RefundButton.vue（更新）
**ファイル:** `src/components/RefundButton.vue`

**更新内容:**
- Supabase Edge Functionの使用
- `orderId`ベースの返金処理
- イベント発火（success/error）
- ローディング状態の管理

### 4. Vercel API Route（バックアップ）
**ファイル:** `api/square-refund.js`

**機能:**
- Supabase Edge Functionが使えない場合のバックアップ
- Square SDK（Node.js版）を使用した返金処理

## 決済フロー

### 通常の決済フロー
1. ✅ お客様が注文情報を入力（Vue）
2. ✅ Supabase Edge Function `square-checkout`にPOST
3. ✅ Edge FunctionでSquare Checkout API呼び出し
4. ✅ 決済リンク（checkout_url）をVueへ返す
5. ✅ Vueでそのリンクにリダイレクト
6. ✅ お客様がクレジットカード情報を入力
7. ✅ 決済完了
8. ✅ Square webhook経由で通知（または`square-payment-complete`呼び出し）
9. ✅ 商品在庫を減らす
10. ✅ 管理者へ決済完了＋発送依頼メール送信

### 返金フロー
1. ✅ 管理者が注文管理画面で返金ボタンをクリック
2. ✅ 返金理由を入力
3. ✅ Supabase Edge Function `square-refund`にPOST
4. ✅ Edge FunctionでSquare Refunds API呼び出し
5. ✅ 注文ステータスを`refunded`に更新
6. ✅ 商品在庫を復元
7. ✅ 管理者とお客様へメール通知
8. ✅ 注文リストを更新

## セットアップ手順

### 1. データベースマイグレーション
```bash
cd /Users/apple/Desktop/sample-homepage
supabase db push
```

または、Supabase Dashboardで以下のSQLを実行:
```sql
-- supabase/migrations/20250103_add_refund_columns.sql の内容を実行
```

### 2. Supabase Edge Functionのデプロイ
```bash
# square-refund関数をデプロイ
supabase functions deploy square-refund

# 環境変数を設定（Supabase Dashboard > Project Settings > Edge Functions > Secrets）
# - SQUARE_ENVIRONMENT=sandbox（または production）
# - SQUARE_SANDBOX_ACCESS_TOKEN=<サンドボックストークン>
# - SQUARE_ACCESS_TOKEN=<本番トークン>
# - SUPABASE_URL=<SupabaseプロジェクトURL>
# - SUPABASE_SERVICE_ROLE_KEY=<サービスロールキー>
```

### 3. フロントエンドの確認
- AdminOrderList.vueが正しくインポートされているか確認
- OrderManagement.vueで返金ボタンが表示されるか確認

## テスト方法

### 1. サンドボックス環境でテスト
```bash
# 環境変数を設定
SQUARE_ENVIRONMENT=sandbox
```

### 2. テスト決済を作成
1. 商品を購入
2. Square Checkout経由で決済
3. Webhookで注文ステータスが`paid`に更新されることを確認

### 3. 返金処理をテスト
1. 管理画面 `/admin/orders` にアクセス
2. 決済完了の注文を探す
3. 返金ボタンをクリック
4. 返金理由を入力
5. 返金実行
6. 注文ステータスが`refunded`に更新されることを確認
7. 在庫が復元されていることを確認
8. メールが送信されることを確認

### 4. Square Dashboardで確認
- [Square Dashboard](https://squareupsandbox.com/dashboard) にログイン
- Payments → Refunds で返金が記録されていることを確認

## トラブルシューティング

### 返金が失敗する場合

1. **決済IDが見つからない**
   - `square_payment_id`カラムが正しく保存されているか確認
   - Webhook処理が正常に動作しているか確認

2. **Square APIエラー**
   - アクセストークンが正しいか確認
   - 環境（sandbox/production）が正しいか確認
   - 決済が返金可能な状態か確認（決済完了から一定期間内）

3. **在庫が復元されない**
   - `succulents`テーブルの更新権限を確認
   - RLSポリシーを確認

### デバッグ方法

```bash
# Supabase Edge Functionのログを確認
supabase functions logs square-refund --follow

# データベースの状態を確認
# Supabase Dashboard > Table Editor > orders
```

## セキュリティ考慮事項

1. **認証・認可**
   - 管理者のみが返金機能にアクセスできることを確認
   - RLSポリシーで適切な権限設定

2. **べき等性**
   - 同じ注文に対して複数回返金が実行されないようチェック
   - `refunded`フラグで二重返金を防止

3. **監査ログ**
   - 返金理由を必須入力
   - 返金日時を記録
   - メール通知で履歴を残す

## 今後の改善案

1. **部分返金対応**
   - 現在は全額返金のみ。部分返金に対応

2. **返金履歴の表示**
   - 返金履歴を別テーブルで管理
   - 複数回の返金に対応

3. **自動返金**
   - 注文重複検知時に自動返金
   - 在庫不足時に自動返金

4. **返金理由のプリセット**
   - よくある返金理由をドロップダウンで選択

5. **通知機能の強化**
   - Slack通知
   - 管理画面内の通知バナー

## 参考リンク

- [Square Refunds API Documentation](https://developer.squareup.com/docs/payments-api/refund-payments)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-01-03 | 1.0.0 | 初版リリース - 返金機能の実装 |
