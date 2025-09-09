-- ordersテーブルを一旦削除して作り直し
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    order_number TEXT NOT NULL UNIQUE,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    product_image TEXT,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    current_quantity INTEGER,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    customer_id UUID,
    payment_due_date TIMESTAMP WITH TIME ZONE,
    payment_confirmed_by_customer BOOLEAN DEFAULT FALSE,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_active_order EXCLUDE USING btree (
        product_id WITH =,
        email WITH =
    ) WHERE (
        status = 'pending_payment' AND
        cancelled_at IS NULL
    )
);

-- インデックスの作成
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 重複注文防止のためのトリガー関数
CREATE OR REPLACE FUNCTION prevent_duplicate_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 同じ商品の未キャンセルの注文が存在するかチェック
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE product_id = NEW.product_id
        AND email = NEW.email
        AND status = 'pending_payment'
        AND cancelled_at IS NULL
        AND id != NEW.id
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '48 hours')
    ) THEN
        RAISE EXCEPTION '同じ商品の注文が既に存在します。注文履歴をご確認ください。';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS check_duplicate_orders ON orders;
CREATE TRIGGER check_duplicate_orders
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_orders();

-- 支払い期限切れの自動キャンセル用トリガー関数
CREATE OR REPLACE FUNCTION cancel_expired_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 支払い期限が過ぎた未入金の注文をキャンセル
    IF NEW.status = 'pending_payment' AND 
       NEW.payment_due_date < CURRENT_TIMESTAMP AND 
       NOT NEW.payment_confirmed_by_customer AND
       NEW.cancelled_at IS NULL THEN
        
        -- 在庫を復元
        UPDATE succulents 
        SET quantity = quantity + NEW.quantity
        WHERE id = NEW.product_id;
        
        -- 注文をキャンセル
        NEW.status := 'cancelled';
        NEW.cancelled_at := CURRENT_TIMESTAMP;
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS check_payment_due_date ON orders;
CREATE TRIGGER check_payment_due_date
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION cancel_expired_orders();

-- RLSを無効化（開発中のテスト用）
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- テスト用のダミーデータを挿入
INSERT INTO orders (
    order_number,
    product_id,
    product_name,
    price,
    current_quantity,
    customer_name,
    email,
    phone,
    address,
    payment_method
) VALUES (
    'TEST001',
    '550e8400-e29b-41d4-a716-446655440000', -- ダミーのUUID
    'テスト商品',
    1000,
    10, -- テスト用の在庫数
    'テストユーザー',
    'test@example.com',
    '090-1234-5678',
    '東京都渋谷区',
    'bank'
);
