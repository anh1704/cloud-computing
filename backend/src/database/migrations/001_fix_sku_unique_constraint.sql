-- Migration: Fix SKU unique constraint to only apply to active products
-- This allows reusing SKUs from deleted products

-- Drop the existing unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;

-- Create a partial unique index only for active products
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS products_sku_active_unique 
ON products (sku) 
WHERE status = 'active' AND sku IS NOT NULL;