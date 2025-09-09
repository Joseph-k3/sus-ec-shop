-- ordersテーブルに stock_after_sale カラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_after_sale INTEGER;
COMMENT ON COLUMN orders.stock_after_sale IS '取引完了時点での在庫数';

-- succculentsテーブルにimage_pathカラムが存在することを確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'succulents' 
        AND column_name = 'image_path'
    ) THEN
        ALTER TABLE succulents ADD COLUMN image_path TEXT;
        COMMENT ON COLUMN succulents.image_path IS '商品画像の保存パス';
    END IF;
END $$;

-- ordersテーブルにproduct_deletedカラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_deleted BOOLEAN DEFAULT false;
COMMENT ON COLUMN orders.product_deleted IS '商品が削除された場合true';

-- 商品削除時のトリガー関数を作成（関連する注文のproduct_deletedフラグを更新）
CREATE OR REPLACE FUNCTION update_orders_on_product_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET product_deleted = true 
    WHERE product_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_product_delete'
    ) THEN
        CREATE TRIGGER trigger_product_delete
        BEFORE DELETE ON succulents
        FOR EACH ROW
        EXECUTE FUNCTION update_orders_on_product_delete();
    END IF;
END $$;
