# Copilot Instructions for RoyaltyRadar

## Project Overview

RoyaltyRadar is an AI-powered music catalog audit and revenue recovery platform built with Next.js 16 (App Router), Prisma + PostgreSQL, BullMQ + Redis, NextAuth.js, and Tailwind CSS v4.

## Build & Test Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run Vitest unit tests
npm run test:e2e     # Run Playwright end-to-end tests
npm run worker       # Start audit background worker
npm run worker:scan  # Start catalog scan worker
npx prisma migrate dev   # Apply database migrations
npx prisma generate      # Regenerate Prisma client
```

## Coding Standards

### TypeScript
- Use strict TypeScript throughout; always type function parameters and return values.
- Prefer interfaces and type aliases for data shapes; augment `next-auth` types in `src/types/next-auth.d.ts`.
- Use Zod schemas (defined in `src/lib/schemas.ts`) for all external input validation with `.safeParse()`.

### API Routes (Next.js App Router)
- Place route handlers under `src/app/api/[feature]/route.ts`.
- Every protected route **must** call `requireAuth()` from `src/lib/auth/get-session.ts` to retrieve `{ userId, orgId, role }`.
- Check permissions with `validatePermission(role, "PERMISSION_NAME")` from `src/lib/auth/rbac.ts` before any mutation.
- Validate request bodies with Zod before use; return `ApiErrors.BadRequest()` on failure.
- Always filter Prisma queries by `orgId` from the session — never trust `orgId` from the request body (multi-tenancy isolation).
- Log all state changes to both the `auditLog` and `activity` tables.
- Use `ApiErrors.*()` from `src/lib/api/error-response.ts` for consistent error responses:
  - `ApiErrors.Unauthorized()` → 401
  - `ApiErrors.Forbidden()` → 403
  - `ApiErrors.BadRequest(msg, details)` → 400
  - `ApiErrors.NotFound(resource)` → 404
  - `ApiErrors.Internal()` → 500

### Database (Prisma)
- Use the singleton Prisma client from `src/lib/infra/db.ts` — never instantiate `PrismaClient` elsewhere.
- Use `db.$transaction(async (prisma: Prisma.TransactionClient) => { ... })` for multi-step operations.
- Handle Prisma error codes: `P2002` (unique constraint) → 409, `P2025` (record not found) → 404.
- Monetary fields use `Decimal` with `@db.Decimal(18, 4)` for amounts and `@db.Decimal(18, 6-8)` for rates — **never use `Float` for money**.

### Error Handling
- Use `try/catch` in every route handler; narrow unknown errors with `error instanceof Error`.
- Never swallow errors silently — always log or return a proper error response.
- Use the `withErrorHandler` wrapper from `src/lib/api/error-handler.ts` for common Prisma/Zod error mapping.

### Logging
- Use the structured logger from `src/lib/infra/logger.ts` (`logger.info`, `logger.warn`, `logger.error`).
- Development: human-readable `[LEVEL] message { context }`.
- Production: structured JSON with `level`, `time`, `msg`, and context fields.

## Security Guidelines

### Authentication & Authorization
- `requireAuth()` must be called at the top of every protected API handler; it throws `AuthError` (401/403) on failure.
- RBAC roles: `OWNER > ADMIN > EDITOR > VIEWER`. Use `validatePermission()` before mutations.
- API keys for public `/api/v1/` endpoints are stored as **SHA-256 hashes**; the `validateApiKey()` function in `src/lib/auth/api-auth.ts` hashes the incoming key before lookup.

### Input & Data Validation
- Validate **all** user-supplied input with Zod before touching the database.
- Never use `orgId`, `userId`, or `role` from the request body — always source them from the authenticated session.
- Sanitize and normalize external music metadata before persistence.

### Webhook Security
- Verify Stripe webhook signatures using the webhook secret before processing events.
- Implement idempotency: check for existing `WebhookEvent` records before processing.
- Guard against metadata injection: verify `stripeCustomerId` from the database against the event payload.
- RoyaltyRadar outbound webhooks use `HMAC-SHA256` signatures in the `X-RoyaltyRadar-Signature` header.

### HTTP Security
- Security headers (CSP with nonce, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) are applied in `src/middleware.ts` — do not remove or weaken them.
- CSRF protection: state-changing requests must pass Origin/Referer header validation in middleware.
- Never commit secrets or credentials; use environment variables defined in `.env.example`.

## Key Directory Reference

| Path | Purpose |
|---|---|
| `src/lib/auth/` | NextAuth config, session helpers, RBAC, API key validation |
| `src/lib/infra/` | Prisma singleton, Redis, structured logger, Stripe client |
| `src/lib/api/` | Standardized error responses and `withErrorHandler` wrapper |
| `src/lib/finance/` | Statement parsing, fuzzy matching, accounting calculations |
| `src/lib/music/` | Catalog scanner, discrepancy engine, metadata normalization |
| `src/lib/clients/` | External API clients (Spotify, MusicBrainz, MLC, Haawk) |
| `src/jobs/` | BullMQ background workers (audit, scan, content-id, fetch) |
| `src/types/` | Global type definitions and NextAuth type augmentation |
| `prisma/schema.prisma` | Full data model |
