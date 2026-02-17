-- Enums for new dashboard and wallet flow
ALTER TYPE "QRStatus" ADD VALUE IF NOT EXISTS 'inventory';
ALTER TYPE "QRStatus" ADD VALUE IF NOT EXISTS 'funded';
ALTER TYPE "QRStatus" ADD VALUE IF NOT EXISTS 'void';

ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'lock_funds';
ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'locked_spend';
ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'unlock_refund';
ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'tech_fee_charge';

DO $$
BEGIN
    CREATE TYPE "CampaignBudgetStatus" AS ENUM ('active', 'refunded', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE "RedemptionEventType" AS ENUM ('redeem_success', 'preview', 'invalid', 'already_redeemed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE "InvoiceType" AS ENUM ('FEE_TAX_INVOICE', 'DEPOSIT_RECEIPT', 'REFUND_RECEIPT', 'MONTHLY_STATEMENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('issued', 'void');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Soft-delete support
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- QR and transaction references
ALTER TABLE "QRCode" ADD COLUMN IF NOT EXISTS "campaignBudgetId" TEXT;
ALTER TABLE "QRCode" ALTER COLUMN "campaignId" DROP NOT NULL;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "campaignBudgetId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "qrId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Campaign budgets
CREATE TABLE IF NOT EXISTS "CampaignBudget" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "vendorId" TEXT NOT NULL,
    "initialLockedAmount" DECIMAL(12,2) NOT NULL,
    "lockedAmount" DECIMAL(12,2) NOT NULL,
    "spentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "CampaignBudgetStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignBudget_pkey" PRIMARY KEY ("id")
);

-- Redemption events
CREATE TABLE IF NOT EXISTS "RedemptionEvent" (
    "id" TEXT NOT NULL,
    "qrId" TEXT,
    "campaignId" TEXT,
    "vendorId" TEXT,
    "userId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "type" "RedemptionEventType" NOT NULL DEFAULT 'preview',
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "accuracyMeters" DECIMAL(10,2),
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionEvent_pkey" PRIMARY KEY ("id")
);

-- Invoices
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "brandId" TEXT,
    "campaignBudgetId" TEXT,
    "type" "InvoiceType" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'issued',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "hsnSac" TEXT,
    "taxRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- Product reports for vendor module
CREATE TABLE IF NOT EXISTS "ProductReport" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReport_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_shareToken_key" ON "Invoice"("shareToken");

CREATE INDEX IF NOT EXISTS "CampaignBudget_campaignId_status_idx" ON "CampaignBudget"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "CampaignBudget_vendorId_status_createdAt_idx" ON "CampaignBudget"("vendorId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "QRCode_campaignBudgetId_status_idx" ON "QRCode"("campaignBudgetId", "status");

CREATE INDEX IF NOT EXISTS "Transaction_campaignBudgetId_idx" ON "Transaction"("campaignBudgetId");
CREATE INDEX IF NOT EXISTS "Transaction_invoiceId_idx" ON "Transaction"("invoiceId");

CREATE INDEX IF NOT EXISTS "RedemptionEvent_campaignId_createdAt_idx" ON "RedemptionEvent"("campaignId", "createdAt");
CREATE INDEX IF NOT EXISTS "RedemptionEvent_type_createdAt_idx" ON "RedemptionEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "RedemptionEvent_userId_createdAt_idx" ON "RedemptionEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RedemptionEvent_vendorId_createdAt_idx" ON "RedemptionEvent"("vendorId", "createdAt");

CREATE INDEX IF NOT EXISTS "Invoice_vendorId_issuedAt_idx" ON "Invoice"("vendorId", "issuedAt");
CREATE INDEX IF NOT EXISTS "Invoice_shareToken_idx" ON "Invoice"("shareToken");

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

CREATE INDEX IF NOT EXISTS "ProductReport_productId_createdAt_idx" ON "ProductReport"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductReport_vendorId_createdAt_idx" ON "ProductReport"("vendorId", "createdAt");

-- Foreign keys
DO $$
BEGIN
    ALTER TABLE "CampaignBudget"
        ADD CONSTRAINT "CampaignBudget_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "CampaignBudget"
        ADD CONSTRAINT "CampaignBudget_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "QRCode"
        ADD CONSTRAINT "QRCode_campaignBudgetId_fkey"
        FOREIGN KEY ("campaignBudgetId") REFERENCES "CampaignBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "Transaction"
        ADD CONSTRAINT "Transaction_campaignBudgetId_fkey"
        FOREIGN KEY ("campaignBudgetId") REFERENCES "CampaignBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "Transaction"
        ADD CONSTRAINT "Transaction_invoiceId_fkey"
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "RedemptionEvent"
        ADD CONSTRAINT "RedemptionEvent_qrId_fkey"
        FOREIGN KEY ("qrId") REFERENCES "QRCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "RedemptionEvent"
        ADD CONSTRAINT "RedemptionEvent_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "RedemptionEvent"
        ADD CONSTRAINT "RedemptionEvent_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "RedemptionEvent"
        ADD CONSTRAINT "RedemptionEvent_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "Invoice"
        ADD CONSTRAINT "Invoice_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "Invoice"
        ADD CONSTRAINT "Invoice_brandId_fkey"
        FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "Invoice"
        ADD CONSTRAINT "Invoice_campaignBudgetId_fkey"
        FOREIGN KEY ("campaignBudgetId") REFERENCES "CampaignBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "InvoiceItem"
        ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "ProductReport"
        ADD CONSTRAINT "ProductReport_vendorId_fkey"
        FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "ProductReport"
        ADD CONSTRAINT "ProductReport_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "ProductReport"
        ADD CONSTRAINT "ProductReport_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
