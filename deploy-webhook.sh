#!/bin/bash

# Edge Function デプロイスクリプト
# 使い方: ./deploy-webhook.sh

echo "=========================================="
echo "Edge Function デプロイスクリプト"
echo "=========================================="
echo ""

# Supabase CLIがインストールされているか確認
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLIがインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI バージョン: $(supabase --version)"
echo ""

# プロジェクトがリンクされているか確認
if [ ! -f ".branches/_current_branch" ]; then
    echo "⚠️ プロジェクトがリンクされていません"
    echo ""
    echo "以下のコマンドでリンクしてください:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    read -p "プロジェクトREFを入力してください: " PROJECT_REF
    
    if [ -n "$PROJECT_REF" ]; then
        echo "リンク中..."
        supabase link --project-ref "$PROJECT_REF"
    else
        echo "❌ プロジェクトREFが入力されませんでした"
        exit 1
    fi
fi

echo "=========================================="
echo "Edge Function をデプロイします"
echo "=========================================="
echo ""

# square-payment-complete をデプロイ
echo "📦 square-payment-complete をデプロイ中..."
supabase functions deploy square-payment-complete

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ デプロイ成功！"
    echo "=========================================="
    echo ""
    echo "次のステップ:"
    echo "1. Supabase Dashboard → Edge Functions でバージョンを確認"
    echo "2. テスト購入を実行"
    echo "3. Logs → Edge Functions でログを確認"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ デプロイ失敗"
    echo "=========================================="
    echo ""
    echo "トラブルシューティング:"
    echo "1. supabase login でログインしているか確認"
    echo "2. supabase projects list でプロジェクト一覧を確認"
    echo "3. 環境変数が設定されているか確認:"
    echo "   supabase secrets list"
    echo ""
    exit 1
fi
