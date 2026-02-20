-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('pending', 'active', 'paused', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'shipped');

-- CreateEnum
CREATE TYPE "CredentialRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('prepaid', 'postpaid');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('digital_voucher', 'printed_qr', 'none');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionCategory" ADD VALUE 'voucher_fee_charge';
ALTER TYPE "TransactionCategory" ADD VALUE 'campaign_payment';
ALTER TYPE "TransactionCategory" ADD VALUE 'admin_adjustment';

-- DropForeignKey
ALTER TABLE "QRCode" DROP CONSTRAINT "QRCode_campaignId_fkey";

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "qrPricePerUnit" DECIMAL(10,2) NOT NULL DEFAULT 1.00;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "allocations" JSONB,
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'prepaid',
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(12,2),
ADD COLUMN     "voucherType" "VoucherType" NOT NULL DEFAULT 'none',
ALTER COLUMN "cashbackAmount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "QRCode" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "QROrder" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cashbackAmount" DECIMAL(10,2) NOT NULL,
    "printCost" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QROrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialRequest" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedUsername" TEXT,
    "requestedPassword" TEXT,
    "status" "CredentialRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "techFeePerQr" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "minPayoutAmount" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "maxDailyPayout" DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
    "qrExpiryDays" INTEGER NOT NULL DEFAULT 365,
    "platformName" TEXT NOT NULL DEFAULT 'Assured Rewards',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@assuredrewards.com',
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QROrder_campaignId_createdAt_idx" ON "QROrder"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "QROrder_vendorId_createdAt_idx" ON "QROrder"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "CredentialRequest_vendorId_status_idx" ON "CredentialRequest"("vendorId", "status");

-- CreateIndex
CREATE INDEX "CredentialRequest_userId_status_idx" ON "CredentialRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_vendorId_key" ON "Brand"("vendorId");

-- CreateIndex
CREATE INDEX "QRCode_campaignId_status_idx" ON "QRCode"("campaignId", "status");

-- CreateIndex
CREATE INDEX "QRCode_vendorId_status_idx" ON "QRCode"("vendorId", "status");

-- CreateIndex
CREATE INDEX "Transaction_referenceId_idx" ON "Transaction"("referenceId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "QROrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialRequest" ADD CONSTRAINT "CredentialRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialRequest" ADD CONSTRAINT "CredentialRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
