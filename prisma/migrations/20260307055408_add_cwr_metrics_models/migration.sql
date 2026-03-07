-- CreateTable
CREATE TABLE "CwrGenerationMetrics" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "workCount" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CwrGenerationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AckImportMetrics" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "conflictCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "societyCode" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AckImportMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationMetrics" (
    "id" TEXT NOT NULL,
    "validatorType" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CwrGenerationMetrics_orgId_idx" ON "CwrGenerationMetrics"("orgId");

-- CreateIndex
CREATE INDEX "CwrGenerationMetrics_timestamp_idx" ON "CwrGenerationMetrics"("timestamp");

-- CreateIndex
CREATE INDEX "CwrGenerationMetrics_version_idx" ON "CwrGenerationMetrics"("version");

-- CreateIndex
CREATE INDEX "AckImportMetrics_orgId_idx" ON "AckImportMetrics"("orgId");

-- CreateIndex
CREATE INDEX "AckImportMetrics_timestamp_idx" ON "AckImportMetrics"("timestamp");

-- CreateIndex
CREATE INDEX "AckImportMetrics_societyCode_idx" ON "AckImportMetrics"("societyCode");

-- CreateIndex
CREATE INDEX "ValidationMetrics_validatorType_idx" ON "ValidationMetrics"("validatorType");

-- CreateIndex
CREATE INDEX "ValidationMetrics_timestamp_idx" ON "ValidationMetrics"("timestamp");
