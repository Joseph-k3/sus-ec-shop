# 🚀 返金機能 クイックスタート

## 3ステップでセットアップ

### Step 1: データベース更新 (1分)
```bash
cd /Users/apple/Desktop/sample-homepage
supabase db push
```

### Step 2: Edge Functionデプロイ (1分)
```bash
supabase functions deploy square-refund
```

### Step 3: 環境変数設定 (1分)
Supabase Dashboard > Edge Functions > Secrets:
```
SQUARE_ENVIRONMENT=sandbox
SQUARE_SANDBOX_ACCESS_TOKEN=<your-token>
```

## ✅ 確認方法

### 1. 管理画面にアクセス
```
http://localhost:5173/admin/orders
```

### 2. 返金ボタンを確認
決済完了の注文に「返金」ボタンが表示されます

### 3. テスト実行
1. 返金ボタンをクリック
2. 返金理由を入力
3. 返金実行
4. ✅ 成功メッセージを確認

## 📋 必要な情報

| 項目 | 場所 |
|------|------|
| Square Access Token | [Square Dashboard](https://squareupsandbox.com/dashboard) > Developers > Credentials |
| Supabase URL | Supabase Dashboard > Settings > API |
| Service Role Key | Supabase Dashboard > Settings > API > service_role |

## 🆘 ヘルプ

**エラーが出た場合:**
1. `REFUND_CHECKLIST.md` の「トラブルシューティング」を確認
2. ブラウザのコンソールでエラーを確認
3. Supabase Logsを確認: `supabase functions logs square-refund`

**詳細ドキュメント:**
- `REFUND_IMPLEMENTATION.md` - 実装詳細
- `REFUND_CHECKLIST.md` - 完全なチェックリスト
- `REFUND_SUMMARY.md` - 実装サマリー

## 🎉 完了！

設定が完了したら、管理画面で返金処理を試してみてください。

**注意:** 本番環境にデプロイする前に、必ずサンドボックス環境でテストしてください。
