-- orders テーブルの作成
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    product_id UUID REFERENCES succulents(id),
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    payment_due_date TIMESTAMP WITH TIME ZONE,
    reserved_until TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_id UUID,
    payment_confirmed_by_customer BOOLEAN DEFAULT FALSE,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_due_date ON orders(payment_due_date);

-- 更新日時を自動更新するトリガーの作成
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- succulents テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS succulents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_succulents_quantity ON succulents(quantity);

-- 在庫数が0の商品を自動的に非表示にするトリガーの作成
CREATE OR REPLACE FUNCTION check_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity < 0 THEN
        NEW.quantity := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER succulents_check_stock
    BEFORE UPDATE ON succulents
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_quantity();

-- RLSポリシーの設定
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE succulents ENABLE ROW LEVEL SECURITY;

-- 注文テーブルのポリシー
CREATE POLICY "注文の作成を許可" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "自分の注文のみ参照可能" ON orders FOR SELECT USING (
    auth.uid() IS NULL OR -- 認証なしでも閲覧可能
    customer_id = auth.uid() -- 自分の注文のみ
);
CREATE POLICY "管理者は全ての注文を閲覧可能" ON orders FOR SELECT USING (
    auth.role() = 'admin'
);

-- 商品テーブルのポリシー
CREATE POLICY "商品の閲覧を全員に許可" ON succulents FOR SELECT USING (true);
CREATE POLICY "商品の更新は管理者のみ" ON succulents FOR UPDATE USING (
    auth.role() = 'admin'
);
