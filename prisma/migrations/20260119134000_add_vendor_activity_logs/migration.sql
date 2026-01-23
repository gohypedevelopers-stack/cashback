CREATE TABLE "VendorActivityLog" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorActivityLog_vendorId_createdAt_idx" ON "VendorActivityLog"("vendorId", "createdAt");
CREATE INDEX "VendorActivityLog_action_idx" ON "VendorActivityLog"("action");

ALTER TABLE "VendorActivityLog" ADD CONSTRAINT "VendorActivityLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
