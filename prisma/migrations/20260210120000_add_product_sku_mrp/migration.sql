-- Add missing Product fields used by the API (sku, mrp)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(10,2);
