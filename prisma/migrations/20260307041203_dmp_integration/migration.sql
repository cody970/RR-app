-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'freemium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "filename" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "writerId" TEXT,
    "publisherId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Writer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "ipiCae" TEXT,
    "ipiBase" TEXT,
    "isni" TEXT,
    "prSociety" TEXT,
    "mrSociety" TEXT,
    "srSociety" TEXT,
    "generallyControlled" BOOLEAN NOT NULL DEFAULT false,
    "saan" TEXT,
    "publisherFee" DOUBLE PRECISION,
    "notes" TEXT,
    "accountNumber" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Writer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "ipiCae" TEXT,
    "ipiBase" TEXT,
    "isni" TEXT,
    "prSociety" TEXT,
    "mrSociety" TEXT,
    "srSociety" TEXT,
    "prSharePercent" DOUBLE PRECISION,
    "mrSharePercent" DOUBLE PRECISION,
    "srSharePercent" DOUBLE PRECISION,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iswc" TEXT,
    "workId" TEXT,
    "versionType" TEXT,
    "originalTitle" TEXT,
    "lastChange" TIMESTAMP(3),
    "durationSec" INTEGER,
    "recordedIndicator" BOOLEAN NOT NULL DEFAULT false,
    "libraryCode" TEXT,
    "cdIdentifier" TEXT,
    "language" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkWriter" (
    "workId" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "splitPercent" DOUBLE PRECISION NOT NULL,
    "role" TEXT,
    "capacity" TEXT,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "saan" TEXT,
    "publisherFee" DOUBLE PRECISION,
    "relativeShare" DOUBLE PRECISION,

    CONSTRAINT "WorkWriter_pkey" PRIMARY KEY ("workId","writerId")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isrc" TEXT,
    "durationSec" INTEGER,
    "recordingTitle" TEXT,
    "versionTitle" TEXT,
    "releaseDate" TIMESTAMP(3),
    "recordLabel" TEXT,
    "artistName" TEXT,
    "artistIsni" TEXT,
    "ean" TEXT,
    "audioFileUrl" TEXT,
    "workId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalSplitRegistered" DOUBLE PRECISION NOT NULL,
    "submissionId" TEXT,
    "confirmationId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "submittedVia" TEXT,
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementLine" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "isrc" TEXT,
    "iswc" TEXT,
    "uses" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountOriginal" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "title" TEXT,
    "artist" TEXT,
    "society" TEXT,
    "territory" TEXT,
    "useType" TEXT,
    "rate" DOUBLE PRECISION,
    "workId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyPeriod" (
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

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "confidence" INTEGER NOT NULL,
    "estimatedImpact" DOUBLE PRECISION,
    "recoveredAmount" DOUBLE PRECISION,
    "amountOriginal" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "resourceType" TEXT,
    "resourceId" TEXT NOT NULL,
    "metadataFix" TEXT,
    "orgId" TEXT NOT NULL,
    "gapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "assigneeEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DspReport" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "territory" TEXT,
    "isrc" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "streams" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "perStreamRate" DOUBLE PRECISION NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DspReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwrRegistration" (
    "id" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "iswc" TEXT,
    "society" TEXT,
    "territory" TEXT,
    "publisherName" TEXT,
    "publisherIpi" TEXT,
    "writerName" TEXT,
    "writerIpi" TEXT,
    "shares" DOUBLE PRECISION,
    "recordType" TEXT,
    "rawRecord" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CwrRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncQuote" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "proposedFee" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLicense" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "workId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "licenseeName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncPlacement" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "productionName" TEXT NOT NULL,
    "episodeOrScene" TEXT,
    "airDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogScan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalWorks" INTEGER NOT NULL DEFAULT 0,
    "totalRecordings" INTEGER NOT NULL DEFAULT 0,
    "unregisteredCount" INTEGER NOT NULL DEFAULT 0,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationGap" (
    "id" TEXT NOT NULL,
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
    "estimatedImpact" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "songviewMatch" JSONB,
    "musicbrainzId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroactiveClaim" (
    "id" TEXT NOT NULL,
    "gapId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetSociety" TEXT NOT NULL,
    "yearsClaimed" INTEGER NOT NULL DEFAULT 2,
    "estimatedValue" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "lodContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetroactiveClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitSignoff" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "writerName" TEXT NOT NULL,
    "proposedSplit" DOUBLE PRECISION NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "disputeReason" TEXT,
    "ipAddress" TEXT,
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitSignoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLCMatchJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalWorks" INTEGER NOT NULL DEFAULT 0,
    "matchesFound" INTEGER NOT NULL DEFAULT 0,
    "matchesProposed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MLCMatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLCMatchResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "workId" TEXT,
    "recordingTitle" TEXT,
    "recordingISRC" TEXT,
    "recordingArtist" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FOUND',
    "confidence" INTEGER,
    "mlcRecordingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLCMatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseOpportunity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "budget" TEXT,
    "deadline" TIMESTAMP(3),
    "media" TEXT,
    "territory" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workId" TEXT,

    CONSTRAINT "LicenseOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterCompany" TEXT,
    "projectType" TEXT NOT NULL,
    "projectTitle" TEXT,
    "media" TEXT,
    "territory" TEXT,
    "term" TEXT,
    "budget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "requestId" TEXT,
    "licenseType" TEXT NOT NULL,
    "licenseeName" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "territory" TEXT,
    "media" TEXT,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Society" (
    "id" TEXT NOT NULL,
    "tisN" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlternateTitle" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleType" TEXT NOT NULL DEFAULT 'AT',
    "language" TEXT,

    CONSTRAINT "AlternateTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAcknowledgement" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "societyCode" TEXT NOT NULL,
    "societyName" TEXT,
    "remoteWorkId" TEXT,
    "iswcAssigned" TEXT,
    "date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "statusMessage" TEXT,
    "transactionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwrExport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "senderCode" TEXT,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "workCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "fileContent" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwrExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwrExportWork" (
    "cwrExportId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'NWR',

    CONSTRAINT "CwrExportWork_pkey" PRIMARY KEY ("cwrExportId","workId")
);

-- CreateTable
CREATE TABLE "AckImport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "senderCode" TEXT,
    "senderName" TEXT,
    "receiverCode" TEXT,
    "creationDate" TIMESTAMP(3),
    "version" TEXT,
    "totalAcks" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AckImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayeeLedger" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "writerId" TEXT,
    "publisherId" TEXT,
    "statementLineId" TEXT,
    "licenseId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayeeLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "writerId" TEXT,
    "publisherId" TEXT,
    "period" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "statementUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "IngestJob_orgId_createdAt_idx" ON "IngestJob"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Writer_orgId_idx" ON "Writer"("orgId");

-- CreateIndex
CREATE INDEX "Writer_lastName_orgId_idx" ON "Writer"("lastName", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Writer_ipiCae_orgId_key" ON "Writer"("ipiCae", "orgId");

-- CreateIndex
CREATE INDEX "Publisher_orgId_idx" ON "Publisher"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_ipiCae_orgId_key" ON "Publisher"("ipiCae", "orgId");

-- CreateIndex
CREATE INDEX "Work_orgId_idx" ON "Work"("orgId");

-- CreateIndex
CREATE INDEX "Work_iswc_idx" ON "Work"("iswc");

-- CreateIndex
CREATE INDEX "Work_title_orgId_idx" ON "Work"("title", "orgId");

-- CreateIndex
CREATE INDEX "Work_lastChange_idx" ON "Work"("lastChange");

-- CreateIndex
CREATE UNIQUE INDEX "Work_iswc_orgId_key" ON "Work"("iswc", "orgId");

-- CreateIndex
CREATE INDEX "WorkWriter_writerId_idx" ON "WorkWriter"("writerId");

-- CreateIndex
CREATE INDEX "Recording_orgId_idx" ON "Recording"("orgId");

-- CreateIndex
CREATE INDEX "Recording_isrc_idx" ON "Recording"("isrc");

-- CreateIndex
CREATE INDEX "Recording_title_orgId_idx" ON "Recording"("title", "orgId");

-- CreateIndex
CREATE INDEX "Recording_artistName_orgId_idx" ON "Recording"("artistName", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_isrc_orgId_key" ON "Recording"("isrc", "orgId");

-- CreateIndex
CREATE INDEX "Registration_workId_idx" ON "Registration"("workId");

-- CreateIndex
CREATE INDEX "Registration_society_idx" ON "Registration"("society");

-- CreateIndex
CREATE INDEX "RegistrationBatch_orgId_idx" ON "RegistrationBatch"("orgId");

-- CreateIndex
CREATE INDEX "Statement_orgId_period_idx" ON "Statement"("orgId", "period");

-- CreateIndex
CREATE INDEX "Statement_source_idx" ON "Statement"("source");

-- CreateIndex
CREATE INDEX "StatementLine_statementId_idx" ON "StatementLine"("statementId");

-- CreateIndex
CREATE INDEX "StatementLine_isrc_idx" ON "StatementLine"("isrc");

-- CreateIndex
CREATE INDEX "StatementLine_iswc_idx" ON "StatementLine"("iswc");

-- CreateIndex
CREATE INDEX "StatementLine_title_idx" ON "StatementLine"("title");

-- CreateIndex
CREATE INDEX "StatementLine_workId_idx" ON "StatementLine"("workId");

-- CreateIndex
CREATE INDEX "RoyaltyPeriod_orgId_period_idx" ON "RoyaltyPeriod"("orgId", "period");

-- CreateIndex
CREATE INDEX "RoyaltyPeriod_orgId_society_idx" ON "RoyaltyPeriod"("orgId", "society");

-- CreateIndex
CREATE INDEX "RoyaltyPeriod_workId_idx" ON "RoyaltyPeriod"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyPeriod_orgId_workId_society_period_key" ON "RoyaltyPeriod"("orgId", "workId", "society", "period");

-- CreateIndex
CREATE INDEX "Finding_orgId_estimatedImpact_idx" ON "Finding"("orgId", "estimatedImpact");

-- CreateIndex
CREATE INDEX "Finding_orgId_status_idx" ON "Finding"("orgId", "status");

-- CreateIndex
CREATE INDEX "Finding_orgId_severity_idx" ON "Finding"("orgId", "severity");

-- CreateIndex
CREATE INDEX "Finding_orgId_createdAt_idx" ON "Finding"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Finding_orgId_type_idx" ON "Finding"("orgId", "type");

-- CreateIndex
CREATE INDEX "Activity_orgId_createdAt_idx" ON "Activity"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditJob_orgId_idx" ON "AuditJob"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_orgId_createdAt_idx" ON "Notification"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "DspReport_orgId_idx" ON "DspReport"("orgId");

-- CreateIndex
CREATE INDEX "DspReport_isrc_idx" ON "DspReport"("isrc");

-- CreateIndex
CREATE INDEX "CwrRegistration_orgId_idx" ON "CwrRegistration"("orgId");

-- CreateIndex
CREATE INDEX "SyncQuote_orgId_idx" ON "SyncQuote"("orgId");

-- CreateIndex
CREATE INDEX "SyncQuote_workId_idx" ON "SyncQuote"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncLicense_quoteId_key" ON "SyncLicense"("quoteId");

-- CreateIndex
CREATE INDEX "SyncLicense_orgId_idx" ON "SyncLicense"("orgId");

-- CreateIndex
CREATE INDEX "SyncLicense_workId_idx" ON "SyncLicense"("workId");

-- CreateIndex
CREATE INDEX "SyncPlacement_orgId_idx" ON "SyncPlacement"("orgId");

-- CreateIndex
CREATE INDEX "SyncPlacement_workId_idx" ON "SyncPlacement"("workId");

-- CreateIndex
CREATE INDEX "CatalogScan_orgId_idx" ON "CatalogScan"("orgId");

-- CreateIndex
CREATE INDEX "RegistrationGap_scanId_idx" ON "RegistrationGap"("scanId");

-- CreateIndex
CREATE INDEX "RegistrationGap_status_idx" ON "RegistrationGap"("status");

-- CreateIndex
CREATE INDEX "RegistrationGap_gapType_idx" ON "RegistrationGap"("gapType");

-- CreateIndex
CREATE UNIQUE INDEX "SplitSignoff_token_key" ON "SplitSignoff"("token");

-- CreateIndex
CREATE INDEX "MLCMatchJob_orgId_idx" ON "MLCMatchJob"("orgId");

-- CreateIndex
CREATE INDEX "MLCMatchResult_jobId_idx" ON "MLCMatchResult"("jobId");

-- CreateIndex
CREATE INDEX "MLCMatchResult_status_idx" ON "MLCMatchResult"("status");

-- CreateIndex
CREATE INDEX "LicenseOpportunity_orgId_idx" ON "LicenseOpportunity"("orgId");

-- CreateIndex
CREATE INDEX "LicenseOpportunity_status_idx" ON "LicenseOpportunity"("status");

-- CreateIndex
CREATE INDEX "LicenseRequest_orgId_idx" ON "LicenseRequest"("orgId");

-- CreateIndex
CREATE INDEX "LicenseRequest_workId_idx" ON "LicenseRequest"("workId");

-- CreateIndex
CREATE INDEX "LicenseRequest_status_idx" ON "LicenseRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "License_requestId_key" ON "License"("requestId");

-- CreateIndex
CREATE INDEX "License_orgId_idx" ON "License"("orgId");

-- CreateIndex
CREATE INDEX "License_workId_idx" ON "License"("workId");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Society_tisN_key" ON "Society"("tisN");

-- CreateIndex
CREATE INDEX "Society_tisN_idx" ON "Society"("tisN");

-- CreateIndex
CREATE INDEX "Society_name_idx" ON "Society"("name");

-- CreateIndex
CREATE INDEX "AlternateTitle_workId_idx" ON "AlternateTitle"("workId");

-- CreateIndex
CREATE INDEX "WorkAcknowledgement_workId_idx" ON "WorkAcknowledgement"("workId");

-- CreateIndex
CREATE INDEX "WorkAcknowledgement_orgId_idx" ON "WorkAcknowledgement"("orgId");

-- CreateIndex
CREATE INDEX "WorkAcknowledgement_societyCode_idx" ON "WorkAcknowledgement"("societyCode");

-- CreateIndex
CREATE INDEX "WorkAcknowledgement_status_idx" ON "WorkAcknowledgement"("status");

-- CreateIndex
CREATE INDEX "CwrExport_orgId_idx" ON "CwrExport"("orgId");

-- CreateIndex
CREATE INDEX "CwrExport_status_idx" ON "CwrExport"("status");

-- CreateIndex
CREATE INDEX "CwrExportWork_workId_idx" ON "CwrExportWork"("workId");

-- CreateIndex
CREATE INDEX "AckImport_orgId_idx" ON "AckImport"("orgId");

-- CreateIndex
CREATE INDEX "AckImport_status_idx" ON "AckImport"("status");

-- CreateIndex
CREATE INDEX "PayeeLedger_orgId_idx" ON "PayeeLedger"("orgId");

-- CreateIndex
CREATE INDEX "PayeeLedger_writerId_idx" ON "PayeeLedger"("writerId");

-- CreateIndex
CREATE INDEX "PayeeLedger_publisherId_idx" ON "PayeeLedger"("publisherId");

-- CreateIndex
CREATE INDEX "PayeeLedger_payoutId_idx" ON "PayeeLedger"("payoutId");

-- CreateIndex
CREATE INDEX "PayeeLedger_status_idx" ON "PayeeLedger"("status");

-- CreateIndex
CREATE INDEX "Payout_orgId_idx" ON "Payout"("orgId");

-- CreateIndex
CREATE INDEX "Payout_writerId_idx" ON "Payout"("writerId");

-- CreateIndex
CREATE INDEX "Payout_publisherId_idx" ON "Payout"("publisherId");

-- AddForeignKey
ALTER TABLE "IngestJob" ADD CONSTRAINT "IngestJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestJob" ADD CONSTRAINT "IngestJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Writer" ADD CONSTRAINT "Writer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkWriter" ADD CONSTRAINT "WorkWriter_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkWriter" ADD CONSTRAINT "WorkWriter_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationBatch" ADD CONSTRAINT "RegistrationBatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementLine" ADD CONSTRAINT "StatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyPeriod" ADD CONSTRAINT "RoyaltyPeriod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "RegistrationGap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DspReport" ADD CONSTRAINT "DspReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwrRegistration" ADD CONSTRAINT "CwrRegistration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncQuote" ADD CONSTRAINT "SyncQuote_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncQuote" ADD CONSTRAINT "SyncQuote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLicense" ADD CONSTRAINT "SyncLicense_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLicense" ADD CONSTRAINT "SyncLicense_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncPlacement" ADD CONSTRAINT "SyncPlacement_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncPlacement" ADD CONSTRAINT "SyncPlacement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogScan" ADD CONSTRAINT "CatalogScan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationGap" ADD CONSTRAINT "RegistrationGap_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "CatalogScan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveClaim" ADD CONSTRAINT "RetroactiveClaim_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "RegistrationGap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveClaim" ADD CONSTRAINT "RetroactiveClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitSignoff" ADD CONSTRAINT "SplitSignoff_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitSignoff" ADD CONSTRAINT "SplitSignoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLCMatchJob" ADD CONSTRAINT "MLCMatchJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLCMatchResult" ADD CONSTRAINT "MLCMatchResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MLCMatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseOpportunity" ADD CONSTRAINT "LicenseOpportunity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseOpportunity" ADD CONSTRAINT "LicenseOpportunity_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseRequest" ADD CONSTRAINT "LicenseRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseRequest" ADD CONSTRAINT "LicenseRequest_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LicenseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternateTitle" ADD CONSTRAINT "AlternateTitle_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAcknowledgement" ADD CONSTRAINT "WorkAcknowledgement_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAcknowledgement" ADD CONSTRAINT "WorkAcknowledgement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwrExport" ADD CONSTRAINT "CwrExport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwrExportWork" ADD CONSTRAINT "CwrExportWork_cwrExportId_fkey" FOREIGN KEY ("cwrExportId") REFERENCES "CwrExport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwrExportWork" ADD CONSTRAINT "CwrExportWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AckImport" ADD CONSTRAINT "AckImport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeLedger" ADD CONSTRAINT "PayeeLedger_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeLedger" ADD CONSTRAINT "PayeeLedger_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeLedger" ADD CONSTRAINT "PayeeLedger_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeLedger" ADD CONSTRAINT "PayeeLedger_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
