-- Supabase管理画面のSQL Editorで実行するSQL
-- 追跡番号と配送業者のカラムをordersテーブルに追加

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

-- カラムにコメントを追加（ドキュメント用）
COMMENT ON COLUMN orders.tracking_number IS '追跡番号 - 配送業者から提供される荷物の追跡番号';
COMMENT ON COLUMN orders.shipping_carrier IS '配送業者 - yamato(ヤマト運輸), sagawa(佐川急便), post(日本郵便), other(その他)';

-- 追跡番号での検索を高速化するインデックス（オプション）
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
