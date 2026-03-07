-- =============================================================================
-- Migration: DMP Integration
-- Enhances RoyaltyRadar schema based on Django Music Publisher (DMP) model design
--
-- Changes:
--   1. Society reference table (384 PROs/CMOs from DMP societies.csv)
--   2. Enhanced Writer model (IPI base, ISNI, PR/MR/SR societies, general agreement)
--   3. Enhanced Publisher model (IPI base, ISNI, PR/MR/SR societies)
--   4. Enhanced Work model (stable work_id, version_type, last_change, original_title)
--   5. Enhanced WorkWriter/WriterInWork (capacity, controlled, saan, publisher_fee)
--   6. Enhanced Recording model (recording_title, version_title, release_date, label)
--   7. WorkAcknowledgement model (society ACK tracking)
--   8. CwrExport model (generated CWR file storage)
--   9. AlternateTitle model (CWR alternate titles)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Society reference table
-- -----------------------------------------------------------------------------
CREATE TABLE "Society" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,   -- TIS-N code, zero-padded to 3 digits
    "name"      TEXT NOT NULL,   -- Organisation name (e.g. "ASCAP")
    "country"   TEXT NOT NULL,   -- Country (e.g. "UNITED STATES")
    "label"     TEXT NOT NULL,   -- Display: "NAME (COUNTRY)"
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Society_code_key" ON "Society"("code");
CREATE INDEX "Society_name_idx" ON "Society"("name");
CREATE INDEX "Society_country_idx" ON "Society"("country");

-- -----------------------------------------------------------------------------
-- 2. Enhanced Writer model
-- New columns added to existing Writer table
-- -----------------------------------------------------------------------------

-- Split name into first/last (DMP pattern)
ALTER TABLE "Writer" ADD COLUMN "firstName"     TEXT;
ALTER TABLE "Writer" ADD COLUMN "lastName"      TEXT;

-- IPI Base Number (I-NNNNNNNNN-C)
ALTER TABLE "Writer" ADD COLUMN "ipiBase"       TEXT;

-- ISNI (International Standard Name Identifier)
ALTER TABLE "Writer" ADD COLUMN "isni"          TEXT;

-- Society affiliations (TIS-N codes)
ALTER TABLE "Writer" ADD COLUMN "prSociety"     TEXT;  -- Performance Rights
ALTER TABLE "Writer" ADD COLUMN "mrSociety"     TEXT;  -- Mechanical Rights
ALTER TABLE "Writer" ADD COLUMN "srSociety"     TEXT;  -- Synchronisation Rights

-- General agreement with publisher
ALTER TABLE "Writer" ADD COLUMN "generallyControlled"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Writer" ADD COLUMN "saan"                 TEXT;    -- Society-Assigned Agreement Number
ALTER TABLE "Writer" ADD COLUMN "publisherFee"         DECIMAL(5,2);  -- Publisher fee %

-- Internal notes
ALTER TABLE "Writer" ADD COLUMN "notes"         TEXT;

-- Account number for royalty payments
ALTER TABLE "Writer" ADD COLUMN "accountNumber" TEXT;

CREATE INDEX "Writer_prSociety_idx" ON "Writer"("prSociety");
CREATE INDEX "Writer_isni_idx" ON "Writer"("isni") WHERE "isni" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Enhanced Publisher model
-- -----------------------------------------------------------------------------

ALTER TABLE "Publisher" ADD COLUMN "firstName"  TEXT;
ALTER TABLE "Publisher" ADD COLUMN "lastName"   TEXT;
ALTER TABLE "Publisher" ADD COLUMN "ipiBase"    TEXT;
ALTER TABLE "Publisher" ADD COLUMN "isni"       TEXT;
ALTER TABLE "Publisher" ADD COLUMN "prSociety"  TEXT;
ALTER TABLE "Publisher" ADD COLUMN "mrSociety"  TEXT;
ALTER TABLE "Publisher" ADD COLUMN "srSociety"  TEXT;

-- Publishing agreement splits (default: 50% PR, 100% MR, 100% SR)
ALTER TABLE "Publisher" ADD COLUMN "prSharePercent"  DECIMAL(5,2) NOT NULL DEFAULT 50.00;
ALTER TABLE "Publisher" ADD COLUMN "mrSharePercent"  DECIMAL(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE "Publisher" ADD COLUMN "srSharePercent"  DECIMAL(5,2) NOT NULL DEFAULT 100.00;

ALTER TABLE "Publisher" ADD COLUMN "notes"      TEXT;

-- -----------------------------------------------------------------------------
-- 4. Enhanced Work model
-- -----------------------------------------------------------------------------

-- Stable human-readable work ID (e.g. "W000001"), persisted before CWR export
ALTER TABLE "Work" ADD COLUMN "workId"          TEXT;

-- Version type: ORI (original) or MOD (modification)
ALTER TABLE "Work" ADD COLUMN "versionType"     TEXT;  -- ORI | MOD

-- Original title (for MOD works — links to original composition)
ALTER TABLE "Work" ADD COLUMN "originalTitle"   TEXT;

-- Timestamp of last metadata change (drives CWR REV transactions)
ALTER TABLE "Work" ADD COLUMN "lastChange"      TIMESTAMP(3);

-- Duration in seconds
ALTER TABLE "Work" ADD COLUMN "durationSec"     INTEGER;

-- Recorded indicator: Y/N/U
ALTER TABLE "Work" ADD COLUMN "recordedIndicator" TEXT DEFAULT 'U';

-- Library/production music fields
ALTER TABLE "Work" ADD COLUMN "libraryCode"     TEXT;
ALTER TABLE "Work" ADD COLUMN "cdIdentifier"    TEXT;

CREATE UNIQUE INDEX "Work_workId_orgId_key" ON "Work"("workId", "orgId") WHERE "workId" IS NOT NULL;
CREATE INDEX "Work_lastChange_idx" ON "Work"("lastChange");
CREATE INDEX "Work_versionType_idx" ON "Work"("versionType");

-- -----------------------------------------------------------------------------
-- 5. Enhanced WorkWriter (WriterInWork) model
-- Drop and recreate with additional columns
-- -----------------------------------------------------------------------------

-- Add new columns to existing WorkWriter table
ALTER TABLE "WorkWriter" ADD COLUMN "capacity"      TEXT;     -- C, A, CA, AR, AD, TR, etc.
ALTER TABLE "WorkWriter" ADD COLUMN "controlled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkWriter" ADD COLUMN "saan"          TEXT;     -- Per-work SAAN override
ALTER TABLE "WorkWriter" ADD COLUMN "publisherFee"  DECIMAL(5,2);  -- Per-work fee override

-- Rename splitPercent to relativeShare for DMP alignment (keep splitPercent as alias)
ALTER TABLE "WorkWriter" ADD COLUMN "relativeShare" DECIMAL(6,4);

-- Populate relativeShare from splitPercent
UPDATE "WorkWriter" SET "relativeShare" = "splitPercent";

CREATE INDEX "WorkWriter_controlled_idx" ON "WorkWriter"("controlled");
CREATE INDEX "WorkWriter_capacity_idx" ON "WorkWriter"("capacity");

-- -----------------------------------------------------------------------------
-- 6. Enhanced Recording model
-- -----------------------------------------------------------------------------

-- Separate recording title from work title (CWR pattern)
ALTER TABLE "Recording" ADD COLUMN "recordingTitle"       TEXT;
ALTER TABLE "Recording" ADD COLUMN "recordingTitleSuffix" TEXT;
ALTER TABLE "Recording" ADD COLUMN "versionTitle"         TEXT;
ALTER TABLE "Recording" ADD COLUMN "versionTitleSuffix"   TEXT;

-- Release metadata
ALTER TABLE "Recording" ADD COLUMN "releaseDate"    DATE;
ALTER TABLE "Recording" ADD COLUMN "recordLabel"    TEXT;

-- Artist info
ALTER TABLE "Recording" ADD COLUMN "artistName"    TEXT;
ALTER TABLE "Recording" ADD COLUMN "artistIsni"    TEXT;

-- Audio file path (optional, for DMP OPTION_FILES equivalent)
ALTER TABLE "Recording" ADD COLUMN "audioFileUrl"  TEXT;

CREATE INDEX "Recording_releaseDate_idx" ON "Recording"("releaseDate");
CREATE INDEX "Recording_recordLabel_idx" ON "Recording"("recordLabel");

-- -----------------------------------------------------------------------------
-- 7. WorkAcknowledgement model
-- Tracks society responses to CWR registrations (mirrors DMP WorkAcknowledgement)
-- -----------------------------------------------------------------------------
CREATE TABLE "WorkAcknowledgement" (
    "id"            TEXT NOT NULL,
    "workId"        TEXT NOT NULL,
    "orgId"         TEXT NOT NULL,
    "societyCode"   TEXT NOT NULL,   -- TIS-N code
    "remoteWorkId"  TEXT NOT NULL,   -- Society's internal work ID
    "date"          DATE NOT NULL,   -- Date of acknowledgement
    "status"        TEXT NOT NULL,   -- RA, AS, AC, DU, NP, RC, RE, TE, WA
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one ACK per work+society+remoteId+date+status (idempotent)
CREATE UNIQUE INDEX "WorkAcknowledgement_unique_idx"
    ON "WorkAcknowledgement"("workId", "societyCode", "remoteWorkId", "date", "status");

CREATE INDEX "WorkAcknowledgement_workId_idx"     ON "WorkAcknowledgement"("workId");
CREATE INDEX "WorkAcknowledgement_orgId_idx"      ON "WorkAcknowledgement"("orgId");
CREATE INDEX "WorkAcknowledgement_societyCode_idx" ON "WorkAcknowledgement"("societyCode");
CREATE INDEX "WorkAcknowledgement_status_idx"     ON "WorkAcknowledgement"("status");

ALTER TABLE "WorkAcknowledgement"
    ADD CONSTRAINT "WorkAcknowledgement_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkAcknowledgement"
    ADD CONSTRAINT "WorkAcknowledgement_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 8. CwrExport model
-- Stores generated CWR files (mirrors DMP CWRExport)
-- -----------------------------------------------------------------------------
CREATE TABLE "CwrExport" (
    "id"              TEXT NOT NULL,
    "orgId"           TEXT NOT NULL,
    "filename"        TEXT NOT NULL,   -- e.g. "CW2400010MYPUB.V21"
    "version"         TEXT NOT NULL,   -- 21 | 22 | 30 | 31
    "transactionType" TEXT NOT NULL,   -- NWR | REV
    "cwr"             TEXT,            -- Full CWR file content (populated after generation)
    "workCount"       INTEGER NOT NULL DEFAULT 0,
    "description"     TEXT,
    "year"            INTEGER,
    "numInYear"       INTEGER,
    "createdOn"       TIMESTAMP(3),    -- NULL until CWR is generated
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CwrExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CwrExport_orgId_idx"    ON "CwrExport"("orgId");
CREATE INDEX "CwrExport_version_idx"  ON "CwrExport"("version");
CREATE INDEX "CwrExport_createdOn_idx" ON "CwrExport"("createdOn");

ALTER TABLE "CwrExport"
    ADD CONSTRAINT "CwrExport_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Junction table: CwrExport ↔ Work (many-to-many)
CREATE TABLE "CwrExportWork" (
    "cwrExportId" TEXT NOT NULL,
    "workId"      TEXT NOT NULL,

    CONSTRAINT "CwrExportWork_pkey" PRIMARY KEY ("cwrExportId", "workId")
);

ALTER TABLE "CwrExportWork"
    ADD CONSTRAINT "CwrExportWork_cwrExportId_fkey"
    FOREIGN KEY ("cwrExportId") REFERENCES "CwrExport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CwrExportWork"
    ADD CONSTRAINT "CwrExportWork_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 9. AlternateTitle model
-- Stores CWR alternate titles for works (mirrors DMP AlternateTitle)
-- -----------------------------------------------------------------------------
CREATE TABLE "AlternateTitle" (
    "id"        TEXT NOT NULL,
    "workId"    TEXT NOT NULL,
    "orgId"     TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "suffix"    BOOLEAN NOT NULL DEFAULT false,  -- If true, appended to work title
    "titleType" TEXT NOT NULL DEFAULT 'AT',      -- AT, OT, TT, FT, IT, OL, AL
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlternateTitle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlternateTitle_workId_idx" ON "AlternateTitle"("workId");
CREATE INDEX "AlternateTitle_orgId_idx"  ON "AlternateTitle"("orgId");

ALTER TABLE "AlternateTitle"
    ADD CONSTRAINT "AlternateTitle_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlternateTitle"
    ADD CONSTRAINT "AlternateTitle_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 10. AckImport model
-- Tracks imported CWR ACK files (mirrors DMP ACKImport)
-- -----------------------------------------------------------------------------
CREATE TABLE "AckImport" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "filename"    TEXT NOT NULL,
    "societyCode" TEXT NOT NULL,
    "societyName" TEXT NOT NULL,
    "date"        DATE NOT NULL,
    "report"      TEXT,             -- HTML processing report
    "cwr"         TEXT,             -- Raw ACK file content
    "importedIswcs" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AckImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AckImport_orgId_idx"      ON "AckImport"("orgId");
CREATE INDEX "AckImport_societyCode_idx" ON "AckImport"("societyCode");

ALTER TABLE "AckImport"
    ADD CONSTRAINT "AckImport_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add to Organization relation tracking
ALTER TABLE "Organization" ADD COLUMN "ackImportsCount"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "cwrExportsCount"  INTEGER NOT NULL DEFAULT 0;