-- CreateTable
CREATE TABLE "BulkExportJob" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "scopeLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "totalQrs" INTEGER NOT NULL DEFAULT 0,
    "processedQrs" INTEGER NOT NULL DEFAULT 0,
    "qrsPerSheet" INTEGER,
    "partCount" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileMimeType" TEXT,
    "errorMsg" TEXT,
    "requestParams" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkExportJob_campaignId_createdAt_idx" ON "BulkExportJob"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "BulkExportJob_vendorId_createdAt_idx" ON "BulkExportJob"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "BulkExportJob_vendorId_status_createdAt_idx" ON "BulkExportJob"("vendorId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "BulkExportJob" ADD CONSTRAINT "BulkExportJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkExportJob" ADD CONSTRAINT "BulkExportJob_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
