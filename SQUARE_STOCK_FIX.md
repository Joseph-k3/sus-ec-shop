# Square決済の在庫管理修正

## 問題の原因

Square決済フローで在庫が二重に管理されており、在庫1個の商品を購入すると在庫不足エラーが発生していました。

### 問題の流れ

1. **注文作成時**: トリガー `check_stock_before_order` が発動し、在庫をチェック
2. **Square決済完了**: 決済は成功
3. **Webhook受信時**: `square-webhook` または `square-payment-complete` で在庫を減少
4. **次回購入時**: 既に在庫が0なので、トリガーでエラー発生 ❌

## 修正内容

### マイグレーション: `20250125_fix_square_stock.sql`

在庫チェックトリガーを修正して、決済方法に応じた処理を実装：

```sql
CREATE OR REPLACE FUNCTION check_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Square決済の場合
  IF NEW.payment_method = 'square' THEN
    -- 警告のみ（Webhook受信時に在庫減少）
    IF current_stock < NEW.quantity THEN
      RAISE NOTICE '在庫不足の可能性あり';
    END IF;
    RETURN NEW; -- 処理続行
  END IF;
  
  -- その他の決済方法（銀行振込など）
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION '在庫が不足しています'; -- エラー
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 修正後の動作フロー

### Square決済の場合

```
1. 注文作成 → 在庫チェック（警告のみ、処理は続行）
2. Square Checkout → お客様が決済
3. Webhook受信 → 在庫を減少 ✅
4. メール送信 → 完了
```

### 銀行振込の場合

```
1. 注文作成 → 在庫チェック（不足時はエラー）✅
2. 入金待ち → 管理者が確認
3. 入金確認 → 在庫を減少 ✅
4. 発送 → 完了
```

## 在庫減少のタイミング

| 決済方法 | 在庫減少のタイミング | 実装場所 |
|---------|---------------------|---------|
| **Square決済** | Webhook受信時 | `square-webhook/index.ts` |
| **銀行振込** | 注文作成時 | トリガー（将来的に変更可能） |

## テスト方法

### Square決済のテスト

1. 在庫1個の商品を選択
2. Square決済で購入
3. 決済完了を確認
4. 在庫が0になることを確認
5. もう一度購入を試みる（在庫不足エラーが表示されるべき）

### 期待される動作

- ✅ 在庫1個の商品を購入できる
- ✅ 決済完了後、在庫が0になる
- ✅ 在庫0の商品は購入時にエラーが表示される
- ✅ エラーメッセージが適切

## 関連ファイル

- `supabase/migrations/20250125_fix_square_stock.sql` - トリガー修正
- `supabase/migrations/20250104_fix_stock_concurrency.sql` - 元のトリガー定義
- `supabase/functions/square-webhook/index.ts` - Webhook処理（在庫減少）
- `supabase/functions/square-payment-complete/index.ts` - 決済完了処理（在庫減少）

## 注意事項

### Webhook処理の重複防止

Webhook処理で在庫が二重に減少しないよう、以下を確認してください：

1. `square-webhook` と `square-payment-complete` の両方で在庫を減らしていないか
2. 同じ注文に対して複数回Webhookが来ていないか

### 推奨設定

Square Dashboardで以下のWebhookイベントのみを有効化：

- `payment.created`
- `payment.updated`

不要なイベントは無効化して、重複処理を防止してください。

## トラブルシューティング

### まだ在庫エラーが出る場合

1. **トリガーが正しく更新されているか確認**
   ```sql
   SELECT prosrc FROM pg_proc 
   WHERE proname = 'check_stock_before_order';
   ```

2. **在庫数を確認**
   ```sql
   SELECT id, name, quantity FROM succulents;
   ```

3. **最近の注文を確認**
   ```sql
   SELECT id, order_number, product_id, status, payment_method, created_at
   FROM orders
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### 在庫を手動で復元する場合

```sql
UPDATE succulents 
SET quantity = quantity + 1 
WHERE id = '<product_id>';
```

## 今後の改善案

1. **在庫予約システム**
   - 注文作成時に在庫を「予約」状態にする
   - 決済完了で「確定」、失敗で「解放」

2. **在庫履歴の記録**
   - 在庫変動の履歴を別テーブルで管理
   - 監査とデバッグが容易になる

3. **在庫アラート**
   - 在庫が少なくなったら管理者に通知
   - 在庫切れ前に補充できる

---

**実装日**: 2025年1月25日  
**ステータス**: ✅ 完了・テスト待ち
