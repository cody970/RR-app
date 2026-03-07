# RoyaltyRadar — Code Review

**Date:** March 6, 2026
**Scope:** Full codebase (166 source files)
**Stack:** Next.js 16, React 19, Prisma + Postgres, BullMQ + Redis, Stripe, NextAuth

---

## Executive Summary

RoyaltyRadar is a well-structured Next.js app with a clear domain model and reasonable separation of concerns. However, the review uncovered **4 critical financial bugs**, **several security gaps**, and significant test coverage shortfalls that should be addressed before production use. The most urgent issues involve revenue calculations that can silently lose money, unauthenticated endpoints, and inconsistent authorization checks.

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Critical | 7 | Financial calculation bugs, missing auth, Stripe metadata injection |
| High | 12 | Input validation gaps, inconsistent RBAC, connection leaks, weak passwords |
| Medium | 15 | Type safety, error handling, accessibility, test quality |
| Low | 8 | Logging inconsistency, dead code, minor config issues |

---

## Critical Issues

### 1. Publisher split calculation loses 50% of royalties
**File:** `src/lib/cwr/cwr-generator.ts` (lines 250–269)

The CWR generator's publisher split logic halves the royalty allocation. This directly impacts revenue recovery — the core value proposition of the product.

**Fix:** Audit the split math and add unit tests covering 50/50, 70/30, and single-publisher scenarios.

### 2. Statement amounts doubled on duplicate imports
**File:** `src/lib/finance/statement-parser.ts` (lines 530–560)

Uses Prisma `increment` instead of a replace/upsert strategy when re-importing statements. If the same statement is imported twice, all amounts are doubled.

**Fix:** Switch to idempotent upsert with `set` instead of `increment`, keyed on a unique statement line identifier.

### 3. Zero-amount ledger entries silently discarded
**File:** `src/lib/music/split-engine.ts` (lines 6–14)

Entries with `amount === 0` are filtered out before writing to the ledger. While this seems like an optimization, it breaks the audit trail — auditors need to see that a split was calculated and resulted in zero.

**Fix:** Write all ledger entries regardless of amount. Add a `filtered` flag if you want to hide them in the UI.

### 4. Hardcoded confidence scores in discrepancy engine
**File:** `src/lib/music/discrepancy-engine.ts` (lines 169–186)

Confidence scores are hardcoded rather than derived from actual severity factors. This means all discrepancies look equally likely, undermining prioritization.

### 5. Missing authentication on split resolution endpoint
**File:** `src/app/api/splits/resolve/route.ts` (lines 6–59)

The split resolution endpoint has **zero authentication**. Anyone who knows (or guesses) a token can approve or dispute splits. Tokens are the only protection, and they're not rate-limited.

**Fix:** Add session verification or at minimum validate user identity matches the signoff target. Add rate limiting on token attempts.

### 6. Stripe webhook metadata injection
**File:** `src/app/api/stripe/webhook/route.ts` (lines 40–42)

The webhook handler trusts `session.metadata.orgId` from Stripe checkout data without verifying the customer-org association. An attacker could modify checkout metadata to update a different organization's subscription.

**Fix:** Cross-reference the Stripe customer ID against your organization records before applying changes.

### 7. OAuth users auto-assigned OWNER role
**File:** `src/lib/auth/auth.ts` (lines 64–92)

All new OAuth sign-ups get `role: "OWNER"` and a new organization. There's no email verification check from the OAuth provider, and no way to invite users into existing orgs.

**Fix:** Default to `VIEWER` role. Check `account?.email_verified`. Build an invitation flow for org membership.

---

## High Severity Issues

### Security

- **Weak password policy** (`src/app/api/auth/register/route.ts`): Minimum 6 characters. Increase to 12+ with complexity.
- **No rate limiting on registration**: Enables brute-force account creation and enumeration.
- **No CSRF protection in middleware**: State-changing operations lack CSRF token validation.
- **CSP allows `unsafe-inline`** (`next.config.ts`): Weakens XSS protection. Switch to nonce-based CSP.
- **No API key expiration** (`src/lib/auth/api-auth.ts`): Compromised keys remain valid forever.
- **Docker Compose hardcoded password** (`docker-compose.yml`): `POSTGRES_PASSWORD: password`.

### Data Integrity

- **Inconsistent RBAC across routes**: Some mutations check permissions, others only verify session exists. `/api/findings/bulk` lacks permission checks entirely.
- **PrismaClient connection leak** (`src/app/api/splits/request/route.ts`, `splits/resolve/route.ts`): Creates `new PrismaClient()` per request instead of using the shared singleton from `db.ts`.
- **Missing input validation**: Multiple routes accept unvalidated request bodies — no Zod schemas on `/api/findings/[id]`, `/api/accounting/calculate`, or `/api/v1/ingest`.
- **Currency exchange rates hardcoded** (`src/lib/finance/currency.ts`): Stale rates lead to incorrect financial calculations.
- **CSV ingest has no pagination/batching**: Processing 100K rows in a single Prisma transaction will timeout or OOM.

---

## Medium Severity Issues

### Code Quality
- **Inconsistent error response formats**: Some routes return `new Response(err.message)`, others `NextResponse.json({ error })`. Standardize on a shared error helper.
- **Pervasive `any` types**: `src/app/api/findings/route.ts`, `accounting/payouts/route.ts`, `ingest/csv/route.ts` all use `any` where Prisma types would work.
- **Silent error suppression**: `analytics-view.tsx` has `.catch(() => {})` and `activity-feed.tsx` logs errors but shows no UI feedback.
- **Floating-point financial math** (`src/app/api/ingest/csv/route.ts`): Per-stream rate calculations use JS floats. Use integer cents or a decimal library.

### Frontend
- **Missing error/empty states**: Dashboard components show loading spinners but no error recovery UI.
- **Accessibility gaps**: Missing ARIA labels on sidebar icons, SVG charts lack titles, `alert()` used for form validation instead of accessible components.
- **Double-submission possible**: `SplitResolutionForm.tsx` doesn't disable buttons during async submission.
- **No `AbortController` on fetch**: Navigation away during requests can cause state updates on unmounted components.

### Infrastructure
- **N+1 queries** in `accounting/payouts` and enrichment flows.
- **MusicBrainz pagination hardcap** at 1000 items with no warning logged.
- **Spotify token cache** uses shared mutable state with no locking — race condition under concurrent requests.
- **All external clients fail silently**: Return `null` or `[]` on any error, making failures invisible.

---

## Test Coverage

**Current state:** 6 test files covering ~15% of library code. Zero API route tests. Zero integration tests.

| Area | Tests | Coverage |
|------|-------|----------|
| Music utilities (normalize, ISWC/ISRC validation) | 12 tests | Good |
| Split engine (basic splits, ownership validation) | 3 tests | Minimal |
| Currency formatting | ~4 tests | Partial |
| Rate limiting | 2 tests | **Broken** — mocks don't match implementation |
| RBAC | 3 tests | Missing edge cases |
| Enrichment | ~3 tests | Partial, brittle mocks |
| External clients (9 files) | 0 tests | **None** |
| API routes (30+ files) | 0 tests | **None** |
| Database operations | 0 tests | **None** |
| Workers (audit, scan) | 0 tests | **None** |

**Key gaps:**
- Rate limit test mocks `redis.incr()` directly, but implementation uses `redis.multi()` pipeline — tests pass but don't exercise real code.
- No tests for the enrichment fallback cascade (Spotify → Muso → MusicBrainz).
- Financial calculation edge cases (rounding, negative amounts, zero splits) untested.
- Missing negative-path RBAC tests (lowercase roles, null roles, typos).

---

## Recommendations — Priority Order

### Week 1 (Critical)
1. Fix the publisher split calculation and add golden-path financial tests
2. Make statement import idempotent (fix the `increment` doubling bug)
3. Add authentication to `/api/splits/resolve`
4. Verify Stripe webhook metadata against customer records
5. Use the shared Prisma singleton everywhere (fix connection leak)

### Week 2 (High)
6. Add Zod validation schemas to all API routes
7. Standardize RBAC checks on every mutation endpoint
8. Increase password requirements to 12+ characters
9. Add rate limiting to registration and token endpoints
10. Replace hardcoded currency rates with a live feed or configurable values

### Week 3 (Medium)
11. Fix the broken rate-limit tests
12. Add integration tests for the top 5 API routes
13. Implement consistent error response format
14. Add frontend error boundaries and accessible error states
15. Replace `unsafe-inline` CSP with nonce-based approach

### Ongoing
16. Build test coverage for external clients with retry logic
17. Add API key expiration support
18. Implement structured logging with correlation IDs
19. Batch large CSV imports into chunks of 1000
20. Replace silent `null` returns in clients with typed error results
