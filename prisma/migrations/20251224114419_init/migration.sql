-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to the enum.


ALTER TYPE "BrandStatus" ADD VALUE 'pending';
ALTER TYPE "BrandStatus" ADD VALUE 'rejected';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to the enum.


ALTER TYPE "CampaignStatus" ADD VALUE 'pending';
ALTER TYPE "CampaignStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "vendorId" TEXT;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
