ALTER TABLE "QRCode"
ADD COLUMN IF NOT EXISTS "seriesCode" TEXT,
ADD COLUMN IF NOT EXISTS "seriesOrder" INTEGER,
ADD COLUMN IF NOT EXISTS "sourceBatch" TEXT,
ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "QRCode_vendorId_status_seriesCode_idx"
ON "QRCode"("vendorId", "status", "seriesCode");

CREATE INDEX IF NOT EXISTS "QRCode_vendorId_seriesCode_seriesOrder_idx"
ON "QRCode"("vendorId", "seriesCode", "seriesOrder");
