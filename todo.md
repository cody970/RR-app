# RoyaltyRadar Feature Implementation Plan

## Phase 1: P0 Features (Core Value)

### Feature 2: AI-Powered Smart Matching
- [x] Create `src/lib/finance/fuzzy-match.ts` with Jaro-Winkler + Levenshtein algorithms
- [x] Create title normalization utilities (strip feat., ft., remix tags, punctuation)
- [x] Add `matchConfidence` field to ParsedStatementLine type
- [x] Integrate fuzzy matching into `matchStatementLines()` in statement-parser.ts
- [x] Create `/api/statements/review-matches/route.ts` for confirming/rejecting fuzzy matches
- [x] Create `/dashboard/revenue/review-matches/page.tsx` UI for match review
- [x] Add unit tests for fuzzy matching in `src/__tests__/fuzzy-match.test.ts` (43/43 passing)

### Feature 1: Real-Time SSE Notifications
- [x] Create `/api/events/stream/route.ts` SSE endpoint with auth + orgId filtering
- [x] Create `src/lib/infra/event-bus.ts` Redis Pub/Sub event bus
- [x] Create `src/hooks/useEventStream.ts` client-side EventSource hook
- [x] Update `notification-bell.tsx` to use SSE instead of polling
- [x] Update `catalog-scan/page.tsx` to use SSE instead of setInterval polling

### Feature 3: Historical Trend Analytics & Forecasting
- [x] Extend `/api/analytics/trends/route.ts` with multi-quarter time-series, territory, per-work data
- [x] Add linear regression forecasting to `src/lib/finance/math-utils.ts`
- [x] Create `src/components/dashboard/trend-charts.tsx` with Recharts time-series
- [x] Create `/dashboard/analytics/page.tsx` dedicated analytics dashboard

### Feature 9: Test Coverage Expansion
- [x] Create `src/__tests__/statement-parser.test.ts` - 72 tests covering all 4 society parsers, format detection, edge cases
- [x] Create `src/__tests__/discrepancy-engine.test.ts` - 20 tests covering all 4 check types with Prisma mocking
- [x] Create `src/__tests__/math-utils.test.ts` - 44 tests, 100% coverage for financial math + forecasting
- [x] Create `src/__tests__/fuzzy-match.test.ts` - 43 tests for fuzzy matching algorithms (done with Feature 2)
- [x] Full suite: 179 new tests, all passing

## Phase 2: P1 Features (Productivity)

### Feature 11: Bulk Operations UI
- [x] Create `src/components/dashboard/bulk-action-bar.tsx` reusable component with preset factories
- [x] Update audit page to use BulkActionBar with enrichment + registration actions
- [x] Add bulk enrichment endpoint `/api/enrich/bulk/route.ts`
- [x] Add bulk registration endpoint `/api/registrations/bulk/route.ts`

### Feature 7: Collaborator Portal Enhancement
- [x] Add counter-proposal capability to SplitResolutionForm (3 modes: approve, dispute, counter-propose)
- [x] Create `src/components/portal/split-pie-chart.tsx` — SVG donut chart with legend
- [x] Integrate pie chart into split resolution page and portal dashboard
- [x] Make portal fully mobile-responsive (responsive grid, breakpoints, touch-friendly)
- [x] Add earnings stats, avg split, per-work avg KPI cards to portal dashboard

### Feature 4: Automated Statement Ingestion
- [x] Add `IngestionSource` and `IngestionLog` models to Prisma schema
- [x] Create `/api/ingest/email-webhook/route.ts` for email-based ingestion with HMAC verification
- [x] Create `/dashboard/settings/connections/page.tsx` for managing sources
- [x] Create `/api/settings/connections/route.ts` (GET + POST) for listing/creating sources
- [x] Create `/api/settings/connections/[id]/route.ts` (PATCH + DELETE) for updating/deleting sources
- [x] Create `/api/settings/connections/logs/route.ts` (GET) for activity log

## Phase 3: P2 Features (Platform)

### Feature 8: Public API & Webhooks
- [x] Add `Webhook` and `WebhookDelivery` models to Prisma schema
- [x] Create `src/lib/infra/webhook-delivery.ts` — signing, delivery, dispatch system
- [x] Create `/api/v1/catalog/route.ts` — paginated catalog with search, writers, registrations
- [x] Create `/api/v1/findings/route.ts` — filtered findings with status/severity/type/since
- [x] Create `/api/v1/analytics/route.ts` — summary, revenue, findings breakdown views
- [x] Create `/api/v1/webhooks/` CRUD + `/[id]/deliveries` (API key auth)
- [x] Create `/api/webhooks/` CRUD + `/[id]/deliveries` (session auth for dashboard)
- [x] Create `/dashboard/settings/webhooks/page.tsx` — full management UI with delivery history

### Feature 10: Multi-Currency Support
- [x] Expand `src/lib/finance/currency.ts` — 18 currencies, cross-conversion, detection, society mapping, batch convert
- [x] Extend all 4 statement parsers to detect currency from headers and preserve `amountOriginal`
- [x] Create `src/components/dashboard/currency-toggle.tsx` — CurrencyProvider context, useCurrency hook, CurrencyToggle dropdown
- [x] Create `/api/currency/rates/route.ts` — public rates endpoint with hourly refresh

### Feature 12: Advanced Reporting
- [x] Add `ScheduledReport` model to Prisma schema
- [x] Create `src/lib/reports/report-generator.ts` — 4 report types, CSV/JSON export, schedule calculator
- [x] Create `/api/reports/generate/route.ts` — on-demand report generation
- [x] Create `/api/reports/scheduled/route.ts` (GET + POST) and `/[id]/route.ts` (PATCH + DELETE)
- [x] Create `/dashboard/reports/scheduled/page.tsx` — full management UI with generate-now

## Phase 4: P3 Features (Enterprise)

### Feature 6: Content ID Monitoring
- [x] Create `/api/content-id/monitor/route.ts` — GET (overview/claims/unregistered) + POST (submit for monitoring)
- [x] Create `/dashboard/content-id/page.tsx` — KPI cards, claims list, unregistered tab with bulk submit
- [x] Add CONTENT_ID_UNREGISTERED finding type via createFindings option

### Feature 5: Blockchain-Anchored Audit Trail
- [x] Add `AuditCheckpoint` model to Prisma schema with chain linking and blockchain anchoring fields
- [x] Create `src/lib/infra/audit-chain.ts` — Merkle tree, checkpoint creation, verification, export bundle
- [x] Create `/api/audit-logs/checkpoints/route.ts` (GET + POST) — list and create checkpoints
- [x] Create `/api/audit-logs/checkpoints/[id]/route.ts` (GET) — verify and export verification bundle
- [x] Create `/dashboard/settings/audit-logs/verify/page.tsx` — full verification UI with stats, verify, export