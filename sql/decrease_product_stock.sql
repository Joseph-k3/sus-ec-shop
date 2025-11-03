-- Function to decrease product stock safely
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_id UUID,
  quantity_to_decrease INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE succulents
  SET 
    quantity = GREATEST(0, quantity - quantity_to_decrease),
    updated_at = NOW()
  WHERE id = product_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION decrease_product_stock TO service_role;
GRANT EXECUTE ON FUNCTION decrease_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION decrease_product_stock TO anon;
