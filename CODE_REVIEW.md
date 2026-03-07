# 🔍 Code Review — Royalty Radar (`RR-app`)

**Review Date:** July 2025
**Reviewer:** SuperNinja AI Agent
**Branch:** `main`
**Stack:** Next.js 16 · React 19 · Prisma 5 · PostgreSQL 15 · Redis 7 · BullMQ · Stripe · TypeScript 5

---

## Executive Summary

Royalty Radar is a well-architected music royalty management SaaS with impressive scope — covering catalog management, royalty auditing, statement parsing, split calculations, registration gap detection, licensing workflows, and financial accounting. The codebase demonstrates strong security awareness (CSP headers, CSRF protection, Stripe webhook hardening, RBAC) and solid domain modeling.

However, this review surfaces **7 critical**, **12 high**, and **16 medium** findings spanning security vulnerabilities, data integrity risks, architectural debt, and reliability gaps that should be addressed before production deployment.

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [High-Severity Issues](#2-high-severity-issues)
3. [Medium-Severity Issues](#3-medium-severity-issues)
4. [Architecture & Code Organization](#4-architecture--code-organization)
5. [Data Layer & Schema](#5-data-layer--schema)
6. [Business Logic](#6-business-logic)
7. [Frontend & Components](#7-frontend--components)
8. [Testing & Quality](#8-testing--quality)
9. [DevOps & Infrastructure](#9-devops--infrastructure)
10. [What's Done Well](#10-whats-done-well)
11. [Prioritized Action Plan](#11-prioritized-action-plan)

---

## 1. Critical Security Issues

### 🔴 CRIT-1: API Key Hash Mismatch — Keys Cannot Validate

**Files:** `src/app/api/settings/keys/route.ts`, `src/lib/auth/api-auth.ts`

The API key creation route stores a **SHA-256 hash** of the key:

```typescript
// settings/keys/route.ts
const keyHash = hashApiKey(apiKey);  // SHA-256 hash
await db.apiKey.create({ data: { key: keyHash, ... } });
```

But the validation function queries the database with the **raw key**:

```typescript
// api-auth.ts
const apiKey = await db.apiKey.findUnique({ where: { key } }); // raw key, not hash
```

This means `findUnique({ where: { key: "rr_abc123..." } })` will **never match** the stored hash `"e3b0c44..."`. The entire V1 API (`/api/v1/ingest`) is **completely broken** — no API key will ever validate.

**Fix:** Hash the incoming key before lookup:

```typescript
export async function validateApiKey(rawKey: string | null) {
    if (!rawKey) return null;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await db.apiKey.findUnique({ where: { key: keyHash }, ... });
    // ...
}
```

---

### 🔴 CRIT-2: Arbitrary Field Write via `/api/enrich/apply`

**File:** `src/app/api/enrich/apply/route.ts`

The endpoint accepts a user-supplied `field` name and writes it directly to the database with **no whitelist**:

```typescript
const { resourceType, resourceId, field, value } = await req.json();
await db.work.update({
    where: { id: resourceId, orgId },
    data: { [field]: value }   // ← attacker controls field name + value
});
```

An attacker can overwrite any column on `Work` or `Recording` — including `orgId` (to steal records to another org) or inject data into fields not meant to be user-editable.

**Fix:** Whitelist allowed fields:

```typescript
const ALLOWED_WORK_FIELDS = ["title", "iswc"];
const ALLOWED_RECORDING_FIELDS = ["title", "isrc"];

if (!ALLOWED_WORK_FIELDS.includes(field)) {
    return ApiErrors.BadRequest(`Field "${field}" is not editable`);
}
```

---

### 🔴 CRIT-3: Notification PATCH Lacks Organization Scoping (IDOR)

**File:** `src/app/api/notifications/route.ts`

When marking a single notification as read, the route uses only the notification `id` with **no orgId or userId filter**:

```typescript
await db.notification.update({
    where: { id: body.id },   // ← any notification ID, any user
    data: { read: true },
});
```

Any authenticated user can mark **any other user's** notifications as read by guessing/enumerating IDs (cuid is not cryptographically unpredictable). This is a classic IDOR vulnerability.

**Fix:** Add userId scoping:

```typescript
await db.notification.updateMany({
    where: { id: body.id, userId },
    data: { read: true },
});
```

---

### 🔴 CRIT-4: `findings/route.ts` References Non-Existent `resource` Relation

**File:** `src/app/api/findings/route.ts`

```typescript
const findings = await db.finding.findMany({
    where,
    include: { resource: true },  // ← "resource" is NOT a relation in the schema
    ...
});
```

The `Finding` model has `resourceId` (String) and `resourceType` (String) — a **polymorphic reference** — but no Prisma relation named `resource`. This query will throw a Prisma runtime error, making the **entire findings list endpoint broken**.

**Fix:** Remove the invalid include and perform a manual lookup if resource data is needed, or restructure to use proper foreign keys.

---

### 🔴 CRIT-5: `Float` Used for All Monetary Values in Prisma Schema

**File:** `prisma/schema.prisma`

Every monetary field in the schema uses `Float`:

```prisma
totalAmount   Float   @default(0)
amount        Float
fee           Float
estimatedImpact Float?
recoveredAmount Float?
```

IEEE 754 `Float` has well-documented precision issues for currency. For example, `0.1 + 0.2 = 0.30000000000000004`. Over thousands of statement lines being summed, split, and aggregated, this will cause **real money discrepancies** in royalty calculations.

While `math-utils.ts` has rounding functions, they cannot fully compensate for precision loss during intermediate calculations within Prisma/Postgres.

**Fix:** Use `Decimal` type in Prisma (maps to PostgreSQL `NUMERIC`):

```prisma
totalAmount   Decimal  @default(0) @db.Decimal(12, 4)
amount        Decimal  @db.Decimal(12, 4)
```

This is the industry-standard approach for financial systems.

---

### 🔴 CRIT-6: Currency Rates Based on Randomized Jitter — Not Real Data

**File:** `src/lib/finance/currency.ts`

The `refreshRates()` function applies **random jitter** to hardcoded rates in all environments:

```typescript
const jitter = () => (Math.random() * 0.02) - 0.01; // +/- 1%
CURRENT_RATES = {
    USD: 1.0,
    EUR: 0.92 + jitter(),
    ...
};
```

This means every time rates refresh, conversions for the **same amount** will produce **different results**. In a financial system handling multi-currency royalty statements, this creates non-deterministic and non-reproducible financial calculations — a compliance and audit nightmare.

**Fix:** Remove jitter immediately. Use static rates with a clear `TODO` for production API integration, or integrate a real exchange rate API (Open Exchange Rates, etc.) and store historical rates.

---

### 🔴 CRIT-7: No `NEXTAUTH_SECRET` Enforcement

**File:** `src/lib/auth/auth.ts`

The NextAuth configuration does not set or validate `NEXTAUTH_SECRET`. If this environment variable is missing, NextAuth falls back to a deterministic secret in development but will **fail silently or use insecure defaults** in production, making JWT tokens forgeable.

**Fix:** Add explicit secret configuration and validation:

```typescript
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required");
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    // ...
};
```

---

## 2. High-Severity Issues

### 🟠 HIGH-1: Duplicate Code — Parallel Module Trees

The codebase has **three layers of duplication**:

| Layer | Location | Status |
|-------|----------|--------|
| Legacy app | `legacy-web/` | Full duplicate with different implementations |
| Flat lib files | `src/lib/*.ts` (24 files) | Stale copies of organized modules |
| Organized modules | `src/lib/{auth,infra,music,finance,clients}/` | Active code |

Some flat files (e.g., `src/lib/db.ts`, `src/lib/redis.ts`) are byte-identical to their organized counterparts but others (e.g., `src/lib/auth.ts`, `src/lib/enrichment.ts`, `src/lib/rate-limit.ts`) have **diverged**. This creates confusion about which module is actually used and risks importing stale code.

**Fix:** Delete `src/lib/*.ts` flat files that are duplicated in subdirectories. Delete or gitignore `legacy-web/` entirely. Use a linter rule to prevent imports from deprecated paths.

---

### 🟠 HIGH-2: `cache-utils.ts` Imports from Wrong Path

**File:** `src/lib/infra/cache-utils.ts`

```typescript
import { redis } from "@/lib/redis";  // ← imports flat duplicate, not organized module
```

Should be:
```typescript
import { redis } from "@/lib/infra/redis";
```

This works only because the flat duplicate still exists. If it's cleaned up, this module breaks.

---

### 🟠 HIGH-3: Split Engine Dust Handling Bug

**File:** `src/lib/music/split-engine.ts`

The last-writer "dust" allocation assumes splits sum to 100%, but doesn't verify this:

```typescript
if (index === writers.length - 1) {
    const finalAmount = round(amount - totalAllocated, 4);
    return { writerId: w.writerId, amount: finalAmount };
}
```

If splits total 60% (legitimate underclaim), the last writer gets `amount - totalAllocated` which would be 40% of the total — **massively overpaying** them. The function should use the writer's actual split percentage for every writer and only apply dust correction to the remainder.

**Fix:**
```typescript
if (index === writers.length - 1) {
    const expectedShare = round(amount * (w.splitPercent / 100), 4);
    const dust = round(amount - totalAllocated - expectedShare, 4);
    return { writerId: w.writerId, amount: round(expectedShare + dust, 4) };
}
```

Or better: always calculate each writer's share from their percentage and handle rounding dust separately.

---

### 🟠 HIGH-4: Audit Worker N+1 Query Problem

**File:** `src/jobs/audit-worker.ts`

The audit worker loads **all works, all recordings, and all statement lines** for an organization into memory in a single pass:

```typescript
const [works, recordings, statementLines] = await Promise.all([
    db.work.findMany({ where: { orgId }, include: { writers: true } }),
    db.recording.findMany({ where: { orgId } }),
    db.statementLine.findMany({ where: { statement: { orgId } }, include: { statement: true } })
]);
```

For a catalog with 50,000 works, 100,000 recordings, and 500,000 statement lines, this will **exhaust memory** and likely crash the worker. Additionally, the worker then makes individual `enrichMetadata()` API calls per work/recording (Spotify, MusicBrainz, Muso, SongView), creating massive API call volumes.

**Fix:** Process in paginated batches with cursor-based pagination. Use `pMap` (already available) with reasonable concurrency.

---

### 🟠 HIGH-5: No Pagination Limit Cap on Catalog Route

**File:** `src/app/api/catalog/route.ts`

```typescript
const limit = parseInt(searchParams.get("limit") || "50");
```

No maximum is enforced. A client sending `?limit=999999` could trigger an enormous query. Compare with `catalog-scan/[id]/gaps/route.ts` which correctly caps: `Math.min(parseInt(...), 100)`.

**Fix:** Add `Math.min(limit, 100)` consistently across all paginated endpoints.

---

### 🟠 HIGH-6: OAuth User Creation Race Condition

**File:** `src/lib/auth/auth.ts`

In the `signIn` callback, the code checks if a user exists and then creates one if not:

```typescript
const existingUser = await db.user.findUnique({ where: { email: user.email! } });
if (!existingUser) {
    const org = await db.organization.create({ ... });
    const newUser = await db.user.create({ ... });
}
```

Two simultaneous OAuth logins for the same new email will both pass the `findUnique` check and attempt to create duplicate users, causing a unique constraint violation. This should be wrapped in a transaction with an upsert pattern.

---

### 🟠 HIGH-7: Stripe `STRIPE_SECRET_KEY!` Non-Null Assertion

**File:** `src/lib/infra/stripe.ts`

```typescript
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... });
```

If `STRIPE_SECRET_KEY` is not set, this crashes at module load time with an unhelpful error. This is imported transitively by many modules, meaning a missing env var could crash the entire application.

**Fix:** Add a guard:
```typescript
const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
export const stripe = new Stripe(key, { ... });
```

---

### 🟠 HIGH-8: Statement Import Lacks Transaction Safety

**File:** `src/lib/finance/statement-parser.ts`

The `importStatement()` function performs multiple sequential database operations (delete old statement, delete old lines, create statement with lines, aggregate royalty periods) without wrapping them in a `$transaction`. If the process crashes mid-way, it leaves the database in an inconsistent state with partially deleted/created data.

---

### 🟠 HIGH-9: Payee Balance Calculation Uses In-Memory Summation of Floats

**File:** `src/app/api/accounting/balances/route.ts`

```typescript
for (const ledger of ledgers) {
    current.amount += ledger.amount;  // ← Float accumulation in JS
}
```

Loading all UNPAID ledgers into memory and summing with JavaScript float arithmetic will produce rounding errors. Should use `db.payeeLedger.groupBy()` with `_sum` to let PostgreSQL handle the aggregation at the database level.

---

### 🟠 HIGH-10: Missing RBAC on Several API Routes

Several API routes only check `session?.user` but don't verify RBAC permissions:

| Route | Missing Permission Check |
|-------|------------------------|
| `api/sync/route.ts` | No RBAC (reads sensitive sync data) |
| `api/reports/export/route.ts` | No RBAC (exports all findings) |
| `api/notifications/route.ts` | No RBAC |
| `api/enrich/apply/route.ts` | No RBAC (writes to catalog!) |
| `api/muso/enrich/route.ts` | No RBAC |
| `api/accounting/balances/route.ts` | No RBAC (financial data) |
| `api/accounting/payouts/route.ts` POST | No RBAC (creates payouts!) |
| `api/settings/keys/route.ts` | No RBAC (manages API keys!) |

Compare with well-protected routes like `api/ingest/csv/route.ts` and `api/findings/[id]/route.ts` which correctly use `validatePermission()`.

---

### 🟠 HIGH-11: `(session.user as any).orgId` Casts in Multiple Routes

**Files:** `src/app/api/recordings/[id]/content-id/route.ts`, `src/app/api/catalog-scan/[id]/gaps/[gapId]/lod/route.ts`

```typescript
const orgId = (session.user as any).orgId;
```

These routes bypass TypeScript's type system. If the session type changes or `orgId` is missing, no compile-time error is raised. Use the `requireAuth()` helper (from `get-session.ts`) which provides typed, validated access.

---

### 🟠 HIGH-12: Inconsistent Error Response Formats

The API uses at least four different error response patterns:

```typescript
// Pattern 1: ApiErrors helper (best)
return ApiErrors.Unauthorized();

// Pattern 2: Plain NextResponse
return new NextResponse("Unauthorized", { status: 401 });

// Pattern 3: NextResponse.json with error key
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Pattern 4: apiError utility
return apiError("Internal Server Error", 500);
```

Clients must handle all four shapes. Standardize on `ApiErrors` from `error-response.ts`.

---

## 3. Medium-Severity Issues

### 🟡 MED-1: Password Hashing Uses bcrypt Cost Factor 10

**File:** `src/app/api/auth/register/route.ts`

```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

Cost factor 10 was adequate circa 2015. OWASP 2024 recommends **cost factor 12** minimum for bcrypt. This is a quick configuration change.

---

### 🟡 MED-2: `refreshRates()` Never Called Automatically

**File:** `src/lib/finance/currency.ts`

`refreshRates()` updates exchange rates but is never called by any API route or scheduler. All conversions use the **initial static rates** forever unless someone manually calls the function.

---

### 🟡 MED-3: ISWC Regex Likely Incorrect

**File:** `src/lib/infra/schemas.ts`

```typescript
export const ISWC_REGEX = /^T\d{9}\d$/;
```

An ISWC format is `T-NNN.NNN.NNN-C` (e.g., `T-034.524.680-1`). The regex expects `T` followed by exactly 10 digits with no separators. It should accept both the compact form (`T0345246801`) and the display form with hyphens/dots.

---

### 🟡 MED-4: Search Route Has Unused `searchTerm` Variable

**File:** `src/app/api/search/route.ts`

```typescript
const searchTerm = `%${q}%`;  // ← Declared but never used
```

This suggests a planned raw SQL query that was replaced with Prisma's `contains` filter. Dead code should be removed.

---

### 🟡 MED-5: `math-precision.test.ts` Uses `console.assert` Instead of Vitest

**File:** `src/lib/finance/math-precision.test.ts`

This test file uses `console.assert` and a manual `testMathPrecision()` function instead of Vitest's `describe/it/expect`. It won't be picked up by the test runner.

---

### 🟡 MED-6: Currency Tests Will Fail After Rate Refresh

**File:** `src/__tests__/currency.test.ts`

Tests assert exact conversion values based on static rates (`92 EUR = 100 USD`). If `refreshRates()` is ever called (adding jitter), these tests will fail intermittently. Tests should either mock the rates or test with a known rate snapshot.

---

### 🟡 MED-7: Docker Compose Uses Default Credentials

**File:** `docker-compose.yml`

```yaml
POSTGRES_USER: root
POSTGRES_PASSWORD: password
```

While fine for local dev, this file is committed to the repository. Add a `.env.example` with placeholder values and use `env_file:` in docker-compose.

---

### 🟡 MED-8: Redis Connection Has No Error Handler

**File:** `src/lib/infra/redis.ts`

The Redis client is created without an error event handler. If Redis is unreachable, unhandled errors will crash the process silently.

```typescript
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
```

---

### 🟡 MED-9: Audit Worker Concurrency Set to 5

**File:** `src/jobs/audit-worker.ts`

```typescript
const auditWorker = new Worker<AuditJobData>('audit-queue', processAuditJob, {
    connection: redis as any,
    concurrency: 5,
});
```

Each audit job loads the entire catalog + makes external API calls. Running 5 concurrent audits for different orgs could overwhelm memory and hit API rate limits (especially MusicBrainz which requires 1 req/sec).

---

### 🟡 MED-10: `claim-service.ts` Incorrect Relation Path

**File:** `src/lib/infra/claim-service.ts`

```typescript
const gap = await prisma.registrationGap.findUnique({
    include: {
        scan: { include: { organization: true } },  // ← scan has no "organization" relation
```

The `CatalogScan` model has `orgId` and an `organization` relation, but the include path through `scan` may fail depending on how Prisma resolves the nested include. The code also references `gap.scan.organizationId` which doesn't exist on the model (it's `orgId`). This code likely throws at runtime.

---

### 🟡 MED-11: `RoyaltyPeriod` Aggregation Uses Empty String as `workId`

**File:** `src/lib/finance/statement-parser.ts`

```typescript
await db.royaltyPeriod.upsert({
    where: { orgId_workId_society_period: { orgId, workId: "", society, period } },
    ...
});
```

Using an empty string as a composite unique key placeholder for org-level aggregates is fragile. Consider using `null` with a separate query path, or a dedicated `OrgRoyaltySummary` model.

---

### 🟡 MED-12: No Request Size Limit on Most POST Routes

Only `api/ingest/csv/route.ts` validates payload size (10MB cap). Other POST routes (`api/enrich/apply`, `api/splits/request`, `api/accounting/payouts`, etc.) accept unbounded JSON bodies.

---

### 🟡 MED-13: `dev.db` (SQLite) Committed in `legacy-web/prisma/`

**File:** `legacy-web/prisma/dev.db`

A SQLite database file is checked into the repository. This could contain sensitive development data.

---

### 🟡 MED-14: Duplicate `public/` and `public/samples/` Directories

Both `public/` and `legacy-web/public/` contain identical sample CSV files and assets. This wastes repository space and creates ambiguity.

---

### 🟡 MED-15: `royalty-radar-source.zip` Committed to Repo

A large zip file is checked into the root of the repository. This should be in `.gitignore`.

---

### 🟡 MED-16: Missing `onRejected` Handler for Background DB Update

**File:** `src/lib/auth/api-auth.ts`

```typescript
db.apiKey.update({ ... }).catch(console.error);
```

While the `.catch()` prevents unhandled rejections, using `console.error` loses structured logging context. Use `logger.error` instead.

---

## 4. Architecture & Code Organization

### Strengths
- Clean domain-driven module structure under `src/lib/` with `auth/`, `infra/`, `music/`, `finance/`, `clients/`, `reports/`, `ingest/`, `cwr/`
- Good use of the `requireAuth()` helper to reduce boilerplate
- Centralized error response factory (`ApiErrors`)
- Clean separation between API routes, business logic, and data access

### Issues
- **Three-layer duplication** (legacy-web, flat files, organized modules) is the single biggest maintainability risk
- Inconsistent adoption of patterns (some routes use `requireAuth()`, others manually call `getServerSession()`)
- Missing barrel exports (`index.ts`) in module directories
- `web/` directory appears to be an abandoned third workspace

### Recommendations
1. Delete `legacy-web/`, `web/`, and all flat `src/lib/*.ts` duplicates
2. Standardize all API routes to use `requireAuth()` + `ApiErrors`
3. Create a shared `withApiHandler` wrapper for common patterns (auth, error handling, logging)

---

## 5. Data Layer & Schema

### Strengths
- Comprehensive indexing strategy on high-query columns
- Good use of composite unique constraints (`@@unique([iswc, orgId])`)
- Proper org-scoping on most models via `orgId`
- WebhookEvent idempotency table for Stripe

### Issues
- **Float for money** (CRIT-5) — must migrate to Decimal
- `WorkWriter.splitPercent` is `Float` — should be `Decimal(5, 2)`
- `Finding.resourceId` + `Finding.resourceType` is a polymorphic reference — no FK integrity
- No `@@index` on `StatementLine.statementId` + `isrc` (compound) for statement matching queries
- `RoyaltyPeriod.workId` is `String?` but used with empty string `""` as a sentinel — should be nullable
- No soft-delete support — hard deletes lose audit history
- Missing `updatedAt` on several models (`StatementLine`, `Activity`, `AuditLog`, `DspReport`)

---

## 6. Business Logic

### Strengths
- Comprehensive audit rule engine with 10+ finding types
- Smart enrichment pipeline (Spotify → Muso → MusicBrainz fallback)
- Good statement parser supporting ASCAP, BMI, MLC, SoundExchange formats
- Period-over-period trend analysis in royalty aggregation
- Tamper-evident audit log chain (Merkle hashing)

### Issues
- Split engine dust bug (HIGH-3) could cause significant financial errors
- Currency jitter (CRIT-6) makes financial calculations non-deterministic
- `processStatementLineSplits` doesn't check if ledger entries already exist (double-processing risk)
- `validateSplitOwnership` allows up to `100.001%` — this tolerance should match the schema constraint
- Discrepancy engine runs `checkRevenueDrops(orgId)` without scoping to the current statement

---

## 7. Frontend & Components

### Strengths
- Clean Sidebar component with logical section grouping
- Proper use of `usePathname()` for active state
- Good dark mode support with Tailwind classes
- ErrorBoundary and DataState UI components for resilience

### Issues
- No loading states observed in route pages
- No client-side form validation before API calls
- Missing `aria-*` attributes on interactive navigation elements
- No favicon defined in the app metadata

---

## 8. Testing & Quality

### Current State
- **6 test files** covering: split-engine, RBAC, currency, enrichment, rate-limit, mapping-utils
- Plus 1 non-standard test file (`math-precision.test.ts`) using `console.assert`
- Vitest configured with Node environment and path aliases

### Gaps
- **No integration tests** for any API route
- **No tests** for statement parser (complex parsing logic with 4 format variants)
- **No tests** for audit worker (core business value)
- **No tests** for Stripe webhook handler (critical payment flow)
- Currency tests are fragile (depend on exact static rates)
- No test coverage threshold configured
- No E2E or component tests

### Recommendations
1. Add integration tests for critical API routes using `supertest` or Next.js test helpers
2. Add unit tests for `statement-parser.ts`, `discrepancy-engine.ts`, and `catalog-scanner.ts`
3. Convert `math-precision.test.ts` to proper Vitest format
4. Add coverage threshold (`80%+` for `lib/` directory)

---

## 9. DevOps & Infrastructure

### Strengths
- Docker Compose with PostgreSQL 15 + Redis 7
- Proper global singleton pattern for Prisma and Redis clients
- BullMQ for reliable background job processing
- Structured JSON logging in production, human-readable in dev

### Issues
- No `Dockerfile` for the application itself — only infrastructure
- No health check endpoint beyond `api/health` (not reviewed — may not exist)
- No `.env.example` file documenting required environment variables
- Docker Compose uses hardcoded credentials
- No `docker-compose.override.yml` pattern for local customization
- Worker processes (`audit-worker.ts`, `scan-worker.ts`) run as separate `tsx` processes — no orchestration or restart policy outside Docker
- Missing `redis.on('error')` handler

---

## 10. What's Done Well

| Area | Details |
|------|---------|
| **Security Headers** | Comprehensive CSP, HSTS, X-Frame-Options, Permissions-Policy in `next.config.ts` |
| **CSRF Protection** | Origin/Referer validation in middleware for state-changing methods |
| **Stripe Webhook Hardening** | Idempotency via WebhookEvent table, metadata injection detection, duplicate customer checks |
| **RBAC System** | Clean, typed permission matrix with `hasPermission()` and `validatePermission()` |
| **Rate Limiting** | Redis-backed atomic rate limiting with pipeline (INCR + PEXPIRE) — no TOCTOU race |
| **Audit Trail** | Merkle-chained evidence hashes for tamper detection |
| **Registration Pipeline** | Full workflow: scan → detect gaps → register via TuneRegistry/CWR → retroactive claims |
| **Statement Parser** | Auto-format detection, multi-society support, work matching, period aggregation |
| **Notification System** | Org-wide broadcast + per-user targeting with type/link support |
| **Domain Model** | Rich, well-indexed Prisma schema covering the full royalty lifecycle |

---

## 11. Prioritized Action Plan

### 🔴 P0 — Fix Before Any Deployment (Critical)

| # | Issue | Effort |
|---|-------|--------|
| CRIT-1 | Fix API key hash validation mismatch | 30 min |
| CRIT-2 | Add field whitelist to enrich/apply endpoint | 30 min |
| CRIT-3 | Add userId scoping to notification PATCH | 15 min |
| CRIT-4 | Remove invalid `resource` include from findings route | 15 min |
| CRIT-6 | Remove currency jitter, use deterministic rates | 30 min |
| CRIT-7 | Enforce NEXTAUTH_SECRET in auth config | 15 min |

### 🟠 P1 — Fix Before Production (High)

| # | Issue | Effort |
|---|-------|--------|
| CRIT-5 | Migrate Float → Decimal for all monetary fields | 4-8 hrs |
| HIGH-1 | Delete duplicate code (legacy-web + flat files) | 2-4 hrs |
| HIGH-3 | Fix split engine dust handling | 1 hr |
| HIGH-8 | Wrap statement import in $transaction | 1 hr |
| HIGH-9 | Use DB-level aggregation for balances | 30 min |
| HIGH-10 | Add RBAC checks to unprotected routes | 2 hrs |
| HIGH-12 | Standardize error response format | 2 hrs |

### 🟡 P2 — Fix Soon After Launch (Medium)

| # | Issue | Effort |
|---|-------|--------|
| HIGH-4 | Paginate audit worker data loading | 4 hrs |
| HIGH-5 | Add pagination limit caps | 1 hr |
| HIGH-6 | Fix OAuth race condition with upsert | 1 hr |
| MED-1-16 | Address all medium issues | 4-8 hrs |
| Testing | Add integration tests for critical paths | 8-16 hrs |

---

*End of Review*