-- Migration: Registration Flow Enhancement
-- Adds submission tracking fields to Registration and new RegistrationBatch model

-- Extend Registration model
ALTER TABLE "Registration" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "Registration" ADD COLUMN "confirmationId" TEXT;
ALTER TABLE "Registration" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Registration" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Registration" ADD COLUMN "submittedVia" TEXT;
ALTER TABLE "Registration" ADD COLUMN "errors" TEXT;

-- Add indexes to Registration
CREATE INDEX "Registration_workId_idx" ON "Registration"("workId");
CREATE INDEX "Registration_society_idx" ON "Registration"("society");

-- Create RegistrationBatch table
CREATE TABLE "RegistrationBatch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalWorks" INTEGER NOT NULL DEFAULT 0,
    "submitted" INTEGER NOT NULL DEFAULT 0,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "societies" TEXT[],
    "submittedVia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationBatch_pkey" PRIMARY KEY ("id")
);

-- Add index
CREATE INDEX "RegistrationBatch_orgId_idx" ON "RegistrationBatch"("orgId");

-- Add foreign key
ALTER TABLE "RegistrationBatch" ADD CONSTRAINT "RegistrationBatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
