ALTER TABLE "Brand"
ADD COLUMN IF NOT EXISTS "defaultPlanType" "PlanType" NOT NULL DEFAULT 'prepaid';
