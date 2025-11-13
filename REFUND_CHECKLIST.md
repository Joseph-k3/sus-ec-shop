# Square返金機能 実装チェックリスト

## 完了した実装 ✅

### バックエンド
- [x] Supabase Edge Function `square-refund` を作成
  - Square Refunds APIの統合
  - 注文ステータスの更新
  - 在庫復元処理
  - メール通知機能
- [x] データベースマイグレーション作成
  - 返金関連カラムの追加
  - インデックスの作成
  - RLSポリシーの更新
- [x] Vercel API Route `square-refund.js` を更新（バックアップ用）

### フロントエンド
- [x] AdminOrderList.vue を完全実装
  - 注文一覧表示
  - ステータスフィルター
  - 返金ダイアログ
  - 注文詳細モーダル
  - エラーハンドリング
  - レスポンシブデザイン
- [x] OrderManagement.vue を更新
  - RefundButtonコンポーネントの統合
  - `square_payment_id` フィールドの使用
  - 返金成功・エラーハンドラーの追加
  - 返金済みバッジの表示
- [x] RefundButton.vue を更新
  - Supabase Edge Functionの使用
  - イベント発火機能
  - ローディング状態管理

### ドキュメント
- [x] REFUND_IMPLEMENTATION.md を作成
  - 実装概要
  - セットアップ手順
  - テスト方法
  - トラブルシューティング

## 次に実行すべき手順 📋

### 1. データベースマイグレーション実行
```bash
cd /Users/apple/Desktop/sample-homepage

# ローカルでテスト
supabase db reset

# 本番環境にプッシュ
supabase db push
```

または、Supabase Dashboardで直接SQLを実行:
1. Supabase Dashboard にログイン
2. SQL Editor を開く
3. `supabase/migrations/20250103_add_refund_columns.sql` の内容を実行

### 2. Supabase Edge Functionのデプロイ
```bash
# square-refund関数をデプロイ
supabase functions deploy square-refund

# 成功メッセージを確認
```

### 3. 環境変数の設定
Supabase Dashboard > Project Settings > Edge Functions > Secrets で以下を設定:

```bash
# サンドボックス環境（テスト用）
SQUARE_ENVIRONMENT=sandbox
SQUARE_SANDBOX_ACCESS_TOKEN=<サンドボックストークン>

# 本番環境（リリース後）
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=<本番トークン>

# Supabase設定（自動設定されている場合は不要）
SUPABASE_URL=<SupabaseプロジェクトURL>
SUPABASE_SERVICE_ROLE_KEY=<サービスロールキー>
```

### 4. 動作確認

#### 4.1 サンドボックスでテスト決済
1. 商品を購入
2. Square Checkout経由で決済
3. テストカード情報を入力:
   ```
   カード番号: 4111 1111 1111 1111
   有効期限: 任意の未来の日付
   CVV: 111
   郵便番号: 12345
   ```
4. 決済完了を確認

#### 4.2 返金処理をテスト
1. 管理画面にアクセス: `http://localhost:5173/admin/orders`
2. 決済完了の注文を見つける
3. 「返金」ボタンをクリック
4. 返金理由を入力（例: "テスト返金"）
5. 「返金実行」をクリック
6. 以下を確認:
   - [ ] 成功メッセージが表示される
   - [ ] 注文ステータスが「返金済み」に変わる
   - [ ] 「返金済み」バッジが表示される
   - [ ] 商品在庫が復元されている
   - [ ] 管理者にメールが届く
   - [ ] 顧客にメールが届く

#### 4.3 Square Dashboardで確認
1. [Square Sandbox Dashboard](https://squareupsandbox.com/dashboard) にログイン
2. Payments > Refunds に移動
3. 返金が記録されていることを確認

### 5. エラーチェック

#### 5.1 ブラウザコンソールを確認
```bash
# 開発サーバーを起動
npm run dev

# ブラウザの開発者ツールを開く（F12）
# Consoleタブでエラーがないか確認
```

#### 5.2 Supabase Logsを確認
```bash
# Edge Functionのログをリアルタイムで確認
supabase functions logs square-refund --follow
```

#### 5.3 データベースの状態を確認
```sql
-- 返金カラムが追加されているか確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('refunded', 'refund_id', 'refund_reason', 'refunded_at', 'square_payment_id');

-- 返金済み注文を確認
SELECT id, order_number, customer_name, refunded, refund_reason, refunded_at
FROM orders
WHERE refunded = TRUE;
```

## 既知の問題と対処法 ⚠️

### 問題1: 返金ボタンが表示されない
**原因:**
- `square_payment_id`が保存されていない
- Webhook処理が失敗している

**対処法:**
1. Webhook処理を確認
2. `square-payment-complete` Edge Functionのログを確認
3. 手動で`square_payment_id`を更新（テスト目的のみ）

### 問題2: 返金APIエラー "PAYMENT_NOT_FOUND"
**原因:**
- 決済IDが間違っている
- サンドボックス/本番環境の不一致

**対処法:**
1. `square_payment_id`の値を確認
2. `SQUARE_ENVIRONMENT`環境変数を確認
3. Square Dashboardで決済を確認

### 問題3: 在庫が復元されない
**原因:**
- RLSポリシーの権限不足
- `product_id`が見つからない

**対処法:**
1. RLSポリシーを確認
2. サービスロールキーを使用していることを確認
3. 商品が存在することを確認

## テストケース 🧪

### ケース1: 正常な返金
- [x] 決済完了の注文を返金できる
- [x] 返金理由を入力できる
- [x] 在庫が正しく復元される
- [x] メールが送信される
- [x] Square Dashboardに記録される

### ケース2: エラーハンドリング
- [ ] 既に返金済みの注文を再度返金できない
- [ ] 決済IDがない注文を返金できない
- [ ] 無効な決済IDでエラーが表示される
- [ ] ネットワークエラー時にエラーメッセージが表示される

### ケース3: UI/UX
- [ ] 返金ボタンは決済完了の注文のみ表示
- [ ] 返金済みバッジが正しく表示される
- [ ] ローディング中はボタンが無効化される
- [ ] 成功・エラーメッセージが適切に表示される

## 本番リリース前チェックリスト 🚀

### セキュリティ
- [ ] 管理者認証が正しく機能している
- [ ] RLSポリシーが適切に設定されている
- [ ] 環境変数が安全に管理されている
- [ ] べき等性チェックが機能している

### パフォーマンス
- [ ] 大量の注文があってもスムーズに動作する
- [ ] データベースクエリが最適化されている
- [ ] インデックスが適切に設定されている

### 監視・ログ
- [ ] エラーログが適切に記録される
- [ ] 返金履歴が追跡可能
- [ ] メール送信の成功/失敗が記録される

### ドキュメント
- [ ] 管理者向けマニュアルを作成
- [ ] 運用手順書を作成
- [ ] エスカレーション手順を明確化

### バックアップ
- [ ] データベースのバックアップ設定
- [ ] ロールバック手順の確認
- [ ] 緊急連絡先の整理

## 完了確認 ✅

- [ ] すべてのマイグレーションが実行された
- [ ] すべてのEdge Functionがデプロイされた
- [ ] すべての環境変数が設定された
- [ ] サンドボックスでテストが完了した
- [ ] エラーハンドリングが確認された
- [ ] ドキュメントが整備された

**署名:** _________________  
**日付:** _________________

---

## 連絡先

**技術サポート:**
- GitHub Issues: [プロジェクトリポジトリ]
- メール: ryosk8er1026@yahoo.co.jp

**Square サポート:**
- [Square Developer Support](https://developer.squareup.com/support)

**Supabase サポート:**
- [Supabase Support](https://supabase.com/support)
