-- Add Stripe subscription fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credits" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planType" TEXT DEFAULT 'FREE' NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- Add unique constraints for Stripe IDs
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- Add additional indexes for Resume table
CREATE INDEX IF NOT EXISTS "Resume_status_idx" ON "Resume"("status");
CREATE INDEX IF NOT EXISTS "Resume_createdAt_idx" ON "Resume"("createdAt");
