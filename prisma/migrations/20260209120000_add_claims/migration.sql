CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Claim_token_key" ON "Claim"("token");
CREATE INDEX "Claim_expiresAt_idx" ON "Claim"("expiresAt");
CREATE INDEX "Claim_claimedByUserId_claimedAt_idx" ON "Claim"("claimedByUserId", "claimedAt");

ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
