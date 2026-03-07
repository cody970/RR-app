-- Add smart matching fields to StatementLine for AI-powered fuzzy matching
-- These fields track how each statement line was matched to a catalog work

-- Add matchMethod column to track the matching algorithm used
ALTER TABLE "StatementLine" ADD COLUMN "matchMethod" TEXT;

-- Add matchConfidence column to store 0-100 confidence score
ALTER TABLE "StatementLine" ADD COLUMN "matchConfidence" INTEGER;

-- Add needsReview flag to identify fuzzy matches requiring user review
ALTER TABLE "StatementLine" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- Add reviewedAt timestamp to track when a match was reviewed
ALTER TABLE "StatementLine" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- Add reviewedBy to track which user reviewed the match
ALTER TABLE "StatementLine" ADD COLUMN "reviewedBy" TEXT;

-- Create index on needsReview for efficient queries on pending reviews
CREATE INDEX "StatementLine_needsReview_idx" ON "StatementLine"("needsReview");
