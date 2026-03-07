# Production Bug Investigation Report

## Executive Summary
Investigating intermittent failures in the RoyaltyRadar application. Initial analysis reveals a Next.js-based music royalty management platform with background job processing using BullMQ and Redis.

## Application Overview
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: BullMQ with Redis
- **Architecture**: Main application + background workers for audit and catalog scanning

## Initial Findings

### 1. Potential Race Condition in Audit Job Management
**Location**: `src/app/api/audit/run/route.ts`

**Issue**: The code attempts to prevent concurrent audit jobs with a check-and-act pattern that's not atomic:
```typescript
const activeJob = await db.auditJob.findFirst({
    where: { orgId, status: "PROCESSING" }
});

if (activeJob) {
    return new NextResponse("An audit is already in progress", { status: 409 });
}
```

**Problem**: Between the `findFirst` query and the subsequent `create` operation, another request could create an audit job, leading to concurrent processing.

**Impact**: Can cause duplicate audits, resource contention, and data inconsistencies.

### 2. Rate Limiting Race Condition
**Location**: `src/lib/infra/rate-limit.ts`

**Current Implementation**:
```typescript
const pipeline = redis.multi();
pipeline.incr(key);
pipeline.pexpire(key, windowMs);
const results = await pipeline.exec();
```

**Analysis**: This implementation correctly uses Redis transactions, but there's no error handling for pipeline failures.

**Impact**: If the pipeline fails, rate limiting may not work correctly, leading to potential abuse or service degradation.

### 3. Missing Error Handling in Enrichment Services
**Location**: `src/lib/music/enrichment.ts`

**Issue**: Multiple external API calls (Spotify, Muso.ai, MusicBrainz) with basic try-catch but no retry logic for transient failures.

**Example**:
```typescript
try {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'RoyaltyRadar/1.0.0 ( cody@royaltyradar.com )',
            'Accept': 'application/json'
        }
    });
```

**Problem**: Network timeouts, rate limits, or temporary API failures will cause the enrichment to fail without retrying.

**Impact**: Intermittent enrichment failures leading to incomplete metadata and potentially missed royalty recovery opportunities.

### 4. Database Connection Issues
**Location**: `src/lib/infra/db.ts`

**Observation**: Simple database connection without connection pooling configuration or connection retry logic.

**Impact**: Under load, database connections may fail or time out, causing intermittent job failures.

### 5. Redis Connection Without Robust Error Handling
**Location**: `src/lib/infra/redis.ts`

**Current Implementation**:
```typescript
export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by bullmq
});
```

**Problem**: No connection error handlers, no reconnection strategy beyond default ioredis behavior.

**Impact**: Redis connection failures will cause BullMQ workers to fail intermittently.

### 6. Worker Error Handling Gaps
**Location**: `src/jobs/audit-worker.ts` and `src/jobs/scan-worker.ts`

**Issue**: Error handlers exist but don't implement comprehensive retry logic or exponential backoff.

**Example**:
```typescript
auditWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, `Job ${job?.id} failed with error ${err.message}`);
});
```

**Problem**: Failed jobs are logged but not automatically retried with appropriate backoff strategies.

**Impact**: Transient failures cause permanent job failures.

## Root Cause Analysis

### Primary Issues:
1. **Race Condition**: Non-atomic check-and-act pattern in audit job creation
2. **Missing Retry Logic**: No exponential backoff for transient failures
3. **Insufficient Error Handling**: External API calls lack comprehensive error recovery
4. **Connection Resilience**: Database and Redis connections lack robust error handling

### Secondary Issues:
1. Limited logging for debugging production issues
2. No circuit breaker pattern for external API calls
3. Missing monitoring and alerting for job failures
4. No comprehensive error categorization

## Recommended Fixes

### High Priority:
1. Implement database-level uniqueness constraints for concurrent audit prevention
2. Add retry logic with exponential backoff for all external API calls
3. Implement circuit breaker pattern for external services
4. Add comprehensive error handling to Redis and database connections

### Medium Priority:
1. Add structured logging with correlation IDs
2. Implement job retry policies in BullMQ
3. Add monitoring and alerting for failed jobs
4. Add health check endpoints for external services

### Low Priority:
1. Implement distributed locking for critical sections
2. Add comprehensive metrics collection
3. Implement graceful shutdown for workers

## Next Steps
1. Set up local environment to reproduce issues
2. Implement fixes starting with high-priority items
3. Add comprehensive logging throughout the application
4. Create hotfix branch and deploy changes
5. Monitor production for stability improvements