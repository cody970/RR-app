-- CreateTable
CREATE TABLE "CatalogScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalWorks" INTEGER NOT NULL DEFAULT 0,
    "totalRecordings" INTEGER NOT NULL DEFAULT 0,
    "unregisteredCount" INTEGER NOT NULL DEFAULT 0,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogScan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistrationGap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanId" TEXT NOT NULL,
    "workId" TEXT,
    "recordingId" TEXT,
    "title" TEXT NOT NULL,
    "isrc" TEXT,
    "iswc" TEXT,
    "artistName" TEXT,
    "society" TEXT NOT NULL,
    "gapType" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "estimatedImpact" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "songviewMatch" TEXT,
    "musicbrainzId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistrationGap_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "CatalogScan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CatalogScan_orgId_idx" ON "CatalogScan"("orgId");

-- CreateIndex
CREATE INDEX "RegistrationGap_scanId_idx" ON "RegistrationGap"("scanId");

-- CreateIndex
CREATE INDEX "RegistrationGap_status_idx" ON "RegistrationGap"("status");

-- CreateIndex
CREATE INDEX "RegistrationGap_gapType_idx" ON "RegistrationGap"("gapType");
