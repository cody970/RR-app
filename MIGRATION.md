# Database Migration Guide

This guide provides comprehensive instructions for deploying the DMP integration schema changes to production.

## Table of Contents

- [Overview](#overview)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Process](#migration-process)
- [Rollback Procedures](#rollback-procedures)
- [Post-Migration Steps](#post-migration-steps)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)

## Overview

The DMP integration introduces the following database changes:

### New Models
- `Society` - Reference table for PRO/CMO societies
- `AlternateTitle` - Alternate work titles
- `WorkAcknowledgement` - CWR ACK processing results
- `CwrExport` - CWR export tracking
- `CwrExportWork` - Work-to-export relationship
- `AckImport` - ACK import tracking

### Enhanced Models
- `Writer` - Added firstName, lastName, IPI variants, society affiliations
- `Publisher` - Added firstName, lastName, IPI variants, society codes, share percentages
- `Work` - Added versionType, originalTitle, lastChange, duration, etc.
- `WorkWriter` - Added capacity, controlled, saan, publisherFee, relativeShare
- `Recording` - Added recordingTitle, versionTitle, releaseDate, EAN, ISNI, etc.

### Migration Strategy
- **Type**: Additive only (no destructive changes)
- **Risk**: Low - Safe for production databases
- **Downtime**: None - Online migration
- **Rollback**: Supported

## Pre-Migration Checklist

### 1. Database Backup

Create a full backup of your production database:

```bash
# Using pg_dump
pg_dump -h your-host -U your-user -d your-database > backup-$(date +%Y%m%d).sql
```

### 2. Verify Database Connection

Ensure you can connect to the production database:

```bash
DATABASE_URL="postgresql://user:password@host:port/database" npx prisma db pull
```

### 3. Review Migration SQL

Review the migration SQL file:

```bash
cat prisma/migrations/20260307041203_dmp_integration/migration.sql
```

## Migration Process

### Step 1: Deploy Application Code

```bash
git checkout main
git pull
npm install
npm run build
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Apply Migration

```bash
npx prisma migrate deploy
```

### Step 4: Seed Society Data

```bash
npm run db:seed
```

## Rollback Procedures

### Rollback Database Changes

```sql
DROP TABLE IF EXISTS "AckImport" CASCADE;
DROP TABLE IF EXISTS "CwrExportWork" CASCADE;
DROP TABLE IF EXISTS "CwrExport" CASCADE;
DROP TABLE IF EXISTS "WorkAcknowledgement" CASCADE;
DROP TABLE IF EXISTS "AlternateTitle" CASCADE;
DROP TABLE IF EXISTS "Society" CASCADE;
```

---

**Last Updated**: 2026-03-07
**Migration Version**: 20260307041203_dmp_integration
**Status**: Ready for Production