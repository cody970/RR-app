-- Phase 3: Royalty Statement Analysis
-- Extend Statement, StatementLine models; add RoyaltyPeriod

-- Statement extensions
ALTER TABLE "Statement" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Statement" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
ALTER TABLE "Statement" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Statement" ADD COLUMN IF NOT EXISTS "lineCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Statement" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PROCESSED';

-- StatementLine extensions
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "iswc" TEXT;
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "society" TEXT;
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "territory" TEXT;
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "useType" TEXT;
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "rate" DOUBLE PRECISION;
ALTER TABLE "StatementLine" ADD COLUMN IF NOT EXISTS "workId" TEXT;

-- RoyaltyPeriod table
CREATE TABLE IF NOT EXISTS "RoyaltyPeriod" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "workId" TEXT,
    "society" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUses" INTEGER NOT NULL DEFAULT 0,
    "avgRate" DOUBLE PRECISION,
    "useType" TEXT,
    "previousAmount" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyPeriod_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Statement_orgId_period_idx" ON "Statement"("orgId", "period");
CREATE INDEX IF NOT EXISTS "Statement_source_idx" ON "Statement"("source");

CREATE INDEX IF NOT EXISTS "StatementLine_iswc_idx" ON "StatementLine"("iswc");
CREATE INDEX IF NOT EXISTS "StatementLine_workId_idx" ON "StatementLine"("workId");

CREATE UNIQUE INDEX IF NOT EXISTS "RoyaltyPeriod_orgId_workId_society_period_key"
    ON "RoyaltyPeriod"("orgId", "workId", "society", "period");
CREATE INDEX IF NOT EXISTS "RoyaltyPeriod_orgId_period_idx" ON "RoyaltyPeriod"("orgId", "period");
CREATE INDEX IF NOT EXISTS "RoyaltyPeriod_orgId_society_idx" ON "RoyaltyPeriod"("orgId", "society");
CREATE INDEX IF NOT EXISTS "RoyaltyPeriod_workId_idx" ON "RoyaltyPeriod"("workId");

-- Foreign keys
ALTER TABLE "RoyaltyPeriod" ADD CONSTRAINT "RoyaltyPeriod_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
