# 🎯 RoyaltyRadar — Feature Improvement Recommendations

> **Prepared by:** SuperNinja AI Agent  
> **Repository:** `cody970/RR-app` (branch: `main`)  
> **Date:** June 2025  
> **Scope:** Full codebase audit covering architecture, engines, API routes, UI/UX, security, testing, and infrastructure.

---

## Executive Summary

RoyaltyRadar is already a sophisticated, well-architected music catalog audit and revenue recovery platform. After a comprehensive review of every source file—from the Prisma schema and background workers through to the dashboard UI and external API clients—the following **12 high-impact feature improvements** have been identified. Each recommendation targets a specific gap or opportunity discovered during the audit, with concrete implementation guidance tailored to the existing codebase.

---

## 1. 🔔 Real-Time WebSocket Notifications & Scan Progress

### Problem
Long-running operations—catalog scans, audit jobs, statement imports—currently rely on polling (`setInterval` in `catalog-scan/page.tsx` at 5-second intervals) or fire-and-forget patterns. Users have no live feedback during multi-minute operations, and the polling approach wastes bandwidth and adds latency.

### Proposed Solution
Implement Server-Sent Events (SSE) or WebSocket channels for real-time progress streaming. The `ProgressCallback` interface already exists in `catalog-scanner.ts` but is only used to update the database; it should also push events to connected clients.

### Implementation Details
- Add a `/api/events/stream` SSE endpoint that authenticates via session and filters events by `orgId`.
- Modify `scan-worker.ts` and `audit-worker.ts` to publish progress events to a Redis Pub/Sub channel (Redis is already a dependency via BullMQ/ioredis).
- On the frontend, replace the `setInterval` polling in `catalog-scan/page.tsx`, `audit/page.tsx`, and `revenue/page.tsx` with an `EventSource` hook.
- Extend the existing `Notification` model to support `REAL_TIME` type notifications that are ephemeral (not persisted).

### Impact
- **UX:** Instant feedback during scans, audits, and imports — users see live progress bars and gap counts updating in real time.
- **Performance:** Eliminates wasteful polling that currently hits the database every 5 seconds per connected client.

---

## 2. 🧠 AI-Powered Smart Matching for Unmatched Statement Lines

### Problem
The statement parser's work-matching logic in `statement-parser.ts` uses only exact ISWC/ISRC lookups and basic substring title matching (`title.includes(searchTitle)`). This misses common real-world variations: alternate titles, featuring artists appended to titles, punctuation differences, and transliterations. The `checkUnmatchedLines` discrepancy check reveals that unmatched lines can represent significant unclaimed revenue.

### Proposed Solution
Introduce a fuzzy/AI-powered matching layer between the current exact-match pipeline and the "unmatched" classification.

### Implementation Details
- Add a **Levenshtein distance** or **Jaro-Winkler similarity** function to `statement-parser.ts` as a Step 4.5 between exact title match and "unmatched" classification. A threshold of 85% similarity should capture common variations without false positives.
- Implement **title normalization**: strip "feat.", "ft.", parenthetical remix tags, "The" prefix, and common punctuation before matching.
- Add a `matchConfidence` field to `StatementLine` (schema update) to track how each line was matched (exact ISWC = 100, exact ISRC = 95, exact title = 90, fuzzy title = 75).
- Create a `/dashboard/revenue/review-matches` page where users can confirm or reject fuzzy matches before they flow into split calculations.
- Long-term: integrate an LLM-based matching API for complex cases (medleys, covers, alternate language titles).

### Impact
- **Revenue Recovery:** Could recover 10-30% of currently unmatched statement line revenue based on typical catalog scenarios.
- **Accuracy:** Confidence scoring gives users transparency into match quality.

---

## 3. 📊 Historical Trend Analytics & Forecasting Dashboard

### Problem
The `RoyaltyPeriod` model already stores period-over-period change data, and the `checkRevenueDrops` engine flags >25% declines. However, the frontend only shows current-period summaries. There's no time-series visualization, no multi-quarter trend lines, and no forecasting — all of which rights holders critically need for catalog valuation and revenue projection.

### Proposed Solution
Build a dedicated **Analytics & Trends** dashboard page with interactive time-series charts, territory breakdowns, and simple forecasting.

### Implementation Details
- Extend `/api/analytics/trends` (already exists but underutilized) to return multi-quarter time-series data grouped by society, work, or territory.
- Create a new `<TrendChart />` component using Recharts (already installed) with:
  - Line chart: total revenue over time, per-society breakdown
  - Bar chart: top 10 works revenue comparison across periods
  - Area chart: cumulative recovered vs. estimated leakage over time
- Add a simple **linear regression forecast** in `math-utils.ts` that projects the next 2 quarters based on available period data.
- Add territory-level breakdown using the `territory` field already captured in `StatementLine`.
- Enable CSV/PDF export of trend data via the existing `export-utils.ts` infrastructure.

### Impact
- **Business Intelligence:** Rights holders can make data-driven decisions about catalog management, identify declining works, and forecast revenue.
- **Retention:** Analytics is the stickiest feature in SaaS — this significantly increases user engagement.

---

## 4. 🔄 Automated Recurring Statement Ingestion (Email/SFTP/API)

### Problem
Statement import is currently a fully manual process — users must download CSVs from each society portal and upload them through the UI (`/api/statements/upload`). For publishers managing hundreds of works across 4+ societies, this quarterly ritual is time-consuming and error-prone.

### Proposed Solution
Build an automated ingestion pipeline that can pull statements from connected sources on a schedule.

### Implementation Details
- **Email ingestion:** Create a webhook endpoint (`/api/ingest/email-webhook`) that receives forwarded statement emails. Parse attachments using the existing `parseStatement()` function. Integrate with services like Mailgun or Postmark for inbound email processing.
- **SFTP polling:** Add a BullMQ recurring job (`statement-fetch-worker.ts`) that connects to configured SFTP endpoints (many societies offer SFTP delivery) using the `ssh2-sftp-client` package.
- **Direct API integration:** For MLC and SoundExchange, use their existing API endpoints (the client stubs in `mlc-client.ts` and `soundexchange-client.ts` already exist) to pull statement data programmatically.
- Add a new `IngestionSource` model to the schema tracking connection configs (encrypted credentials), schedule, and last-sync timestamp.
- Create a `/dashboard/settings/connections` page for managing these automated sources.
- Trigger `runDiscrepancyChecks()` automatically after each successful ingestion (already done in manual upload path).

### Impact
- **Efficiency:** Eliminates hours of manual quarterly work per organization.
- **Timeliness:** Revenue data is available immediately when societies publish, not when users remember to upload.

---

## 5. 🛡️ Comprehensive Audit Trail with Blockchain-Anchored Evidence

### Problem
The current audit logging system (`AuditLog` model with `evidenceHash`) uses SHA-256 hash chaining, which is a great start. However, the chain is only verifiable internally — there's no external anchor point. Additionally, the hash chain could theoretically be rewritten if database access is compromised. For a platform handling financial disputes with PROs, tamper-proof evidence is critical.

### Proposed Solution
Anchor periodic audit log checkpoints to a public blockchain or timestamping service, and build a verification UI.

### Implementation Details
- Add a **daily checkpoint job** that computes a Merkle root of all audit log hashes from the past 24 hours and anchors it to:
  - Option A: Bitcoin blockchain via OP_RETURN (cheapest, ~$0.05/anchor via OpenTimestamps)
  - Option B: Ethereum via a simple storage contract
  - Option C: A timestamping authority (RFC 3161) for enterprise compliance
- Create an `AuditCheckpoint` model storing the Merkle root, anchor transaction ID, and covered log range.
- Build a `/dashboard/settings/audit-logs/verify` page that lets users select any audit log entry and verify its inclusion in an anchored Merkle tree.
- Add an export function that generates a self-contained verification bundle (JSON + proof) that can be shared with PROs during dispute resolution.

### Impact
- **Trust:** Provides independently verifiable proof that audit findings and metadata fixes existed at a specific time.
- **Legal:** Strengthens the platform's position in royalty disputes — timestamped evidence has legal weight.

---

## 6. 🎵 Content ID / Fingerprint Monitoring Integration

### Problem
The existing `recordings/[id]/content-id/route.ts` API stub exists but the platform lacks actual audio fingerprint monitoring. Works can be used on YouTube, TikTok, Instagram, and other UGC platforms without generating royalties if the content isn't registered with Content ID systems.

### Proposed Solution
Integrate with audio fingerprinting and Content ID monitoring services to detect unregistered usage.

### Implementation Details
- Integrate with the **YouTube Content ID API** or a service like **Audible Magic** / **Pex** to monitor for catalog usage across platforms.
- Add a `ContentIdMonitor` model tracking: recording ISRC, platform, registration status, detected usages, and estimated missed revenue.
- Create a background worker (`content-id-worker.ts`) that periodically checks registered recordings against platform APIs.
- Build a `/dashboard/content-id` page showing:
  - Recordings not yet registered with Content ID
  - Detected usages with estimated revenue impact
  - One-click registration workflow
- Connect detected usages to the existing `Finding` model with a new type `CONTENT_ID_UNREGISTERED`.

### Impact
- **Revenue Recovery:** UGC platforms represent one of the fastest-growing revenue streams in music. Unregistered content is literally leaving money on the table.
- **Catalog Coverage:** Provides a complete picture of where a catalog is (and isn't) generating revenue.

---

## 7. 📱 Collaborator Portal Enhancement with Mobile-First Split Negotiation

### Problem
The existing portal (`/portal/`) provides basic earnings viewing and split signoff via token-based links. However, the `SplitResolutionForm` is desktop-only, there's no push notification system for pending signoffs, and the split negotiation process is one-directional (publisher proposes, writer accepts/disputes with text only). Real-world split negotiations involve back-and-forth.

### Proposed Solution
Upgrade the collaborator portal into a full mobile-responsive experience with interactive split negotiation.

### Implementation Details
- **Mobile-first redesign** of `/portal/splits/[token]/page.tsx` with responsive layouts, touch-friendly sliders for counter-proposals, and inline chat.
- Add a `SplitNegotiation` model with: `proposedSplit`, `counterProposal`, `messages[]`, `status` (PROPOSED → COUNTER → AGREED → SIGNED).
- Implement **email + SMS notifications** (via Twilio or similar) when:
  - A new split proposal is sent
  - A counter-proposal is received
  - A split agreement expires (existing `expiresAt` field)
- Add **digital signature capture** (canvas-based) to the signoff flow for legal compliance.
- Build a `/portal/splits/[token]/negotiate` page with a real-time chat interface and split visualization (pie chart showing ownership shares).
- Enable **multi-party** split negotiations (3+ writers) with a round-robin approval flow.

### Impact
- **Velocity:** Faster split resolution means faster registration, which means faster revenue collection.
- **Compliance:** Digital signatures strengthen legal standing of split agreements.

---

## 8. 🔌 Public REST API with SDK & Webhook System

### Problem
The existing `/api/v1/ingest/route.ts` and `/api/docs/route.ts` (Swagger) indicate an intent to offer a public API, and `ApiKey` management exists in the schema. However, there's no webhook system, no versioned SDK, and the API surface is limited to ingestion only. Publishers and their integrators need programmatic access to findings, registrations, and analytics.

### Proposed Solution
Build a complete public API layer with webhooks for event-driven integrations.

### Implementation Details
- **Expand API surface:** Expose read endpoints under `/api/v1/` for: catalog (works, recordings), findings, registrations, analytics, and statements.
- **Webhook system:** Add a `Webhook` model (url, secret, events[], orgId) and a `WebhookDelivery` log table. Fire webhooks on key events:
  - `finding.created`, `finding.recovered`
  - `scan.completed`
  - `statement.imported`
  - `registration.status_changed`
  - `payout.issued`
- Implement webhook signature verification (HMAC-SHA256) and retry logic with exponential backoff.
- **SDK generation:** Use the existing Swagger/OpenAPI spec from `swagger.ts` to auto-generate TypeScript and Python SDKs via `openapi-generator`.
- Build a `/dashboard/settings/webhooks` management page.
- Add webhook testing (fire a test event) and delivery log inspection.

### Impact
- **Integration:** Enables publishers to connect RoyaltyRadar to their existing DAWs, distribution platforms, and accounting systems.
- **Platform Play:** Webhooks transform RoyaltyRadar from a standalone tool into a platform that other services can build on.

---

## 9. 🧪 Test Coverage Expansion & E2E Testing Infrastructure

### Problem
The current test suite covers only unit tests for `split-engine`, `rbac`, `currency`, `enrichment`, `music`, and `rate-limit`. There are no integration tests for API routes, no E2E tests for critical user flows, and no tests for the discrepancy engine, catalog scanner, or statement parser — which are the core revenue-generating features.

### Proposed Solution
Significantly expand test coverage with integration, E2E, and snapshot tests.

### Implementation Details
- **Integration tests** for critical API routes (using Vitest + supertest or Next.js test utilities):
  - `POST /api/ingest/csv` — test all template types, validation errors, CSV injection protection, rate limiting
  - `POST /api/statements/upload` — test all 4 society formats, period detection, work matching
  - `POST /api/audit/run` — test job creation, concurrent job prevention, stuck job recovery
  - `POST /api/catalog-scan` — test scan lifecycle
- **Engine tests** with realistic fixtures:
  - `discrepancy-engine.test.ts` — test all 4 check types with mock DB data
  - `catalog-scanner.test.ts` — test gap detection with mock external API responses
  - `statement-parser.test.ts` — test parsing of each society format with real sample CSVs (samples already exist in `/public/samples/`)
- **E2E tests** using Playwright:
  - Full onboarding flow: register → import CSV → run audit → view findings
  - Statement upload and discrepancy detection flow
  - Split signoff portal flow (token-based access)
- **Snapshot tests** for critical UI components using Vitest + React Testing Library.
- Add a `vitest.config.ts` integration test configuration with a test database using Prisma migrations.
- Target: **80%+ line coverage** for `src/lib/` and **100% coverage** for financial math (`math-utils.ts`, `split-engine.ts`).

### Impact
- **Reliability:** Prevents regressions in the core revenue recovery pipeline.
- **Confidence:** Enables faster iteration and refactoring without fear of breaking financial calculations.

---

## 10. 💱 Multi-Currency Support with Automatic Conversion

### Problem
While the schema has `currency` fields on `Organization`, `PayeeLedger`, and `StatementLine`, and there's a `currency.ts` utility file, the actual implementation treats everything as USD. International publishers receive statements in GBP, EUR, JPY, AUD, and other currencies. The current system either loses precision or requires manual conversion.

### Implementation Details
- **Exchange rate service:** Add a daily BullMQ job that fetches rates from a free API (e.g., `exchangerate-api.com` or ECB) and stores them in an `ExchangeRate` model.
- **Statement import:** Detect currency from society format (MCPS/PRS statements are in GBP, GEMA in EUR) and store `amountOriginal` + `currency` alongside `amount` (converted to org's base currency at import-time rate).
- **Ledger & payouts:** Extend `PayeeLedger` to track both original and converted amounts. Generate payout statements in the writer's preferred currency.
- **Dashboard:** Add a currency toggle to the revenue dashboard showing amounts in original currency vs. base currency.
- **Financial math:** Extend `math-utils.ts` with a `convertCurrency(amount, from, to, date)` function that uses historical rates for accurate period reporting.
- Update the discrepancy engine's `TYPICAL_RATES` to be currency-aware.

### Impact
- **Market Expansion:** Unlocks international publishers who currently can't use the platform accurately.
- **Accuracy:** Proper FX handling prevents material financial discrepancies in payout calculations.

---

## 11. 🏷️ Bulk Operations & Batch Processing UI

### Problem
Several operations that users need to perform on multiple items at once currently require one-at-a-time interaction: dismissing findings, applying enrichment suggestions, initiating registrations, and resolving tasks. The `findings/bulk/route.ts` API exists but the UI doesn't expose it effectively.

### Proposed Solution
Add comprehensive multi-select and bulk action capabilities across all list views.

### Implementation Details
- **Findings page:** Add checkbox selection + bulk action bar (Bulk Dismiss, Bulk Create Tasks, Bulk Mark Recovered) wired to the existing `/api/findings/bulk` endpoint.
- **Catalog page:** Add bulk enrichment (select 50 works → one-click enrich all via Spotify/MusicBrainz/Muso).
- **Registration gaps page:** Add "Register All" button that batch-submits selected gaps to TuneRegistry via the existing `registration-service.ts`.
- **Task board:** Add bulk assignment (assign 10 tasks to a team member) and bulk status change.
- **Import review:** Add a review step after CSV import where users can bulk-accept or bulk-reject mapped rows before committing.
- Create a reusable `<BulkActionBar />` component that floats at the bottom of the screen when items are selected (similar to Gmail's batch action bar).
- All bulk operations should be processed via BullMQ jobs with progress tracking (ties into Feature #1).

### Impact
- **Efficiency:** Reduces time spent on catalog management by 5-10x for large catalogs.
- **UX:** Professional-grade batch workflow expected by enterprise publishers.

---

## 12. 📋 Advanced Reporting & Scheduled Report Delivery

### Problem
The existing `/api/reports/export` route generates one-off exports, and `accounting-pdf.ts` generates payout statements. However, there's no system for scheduled reporting, custom report templates, or multi-format delivery. Publishers need regular reports for their writers, board meetings, and PRO communications.

### Proposed Solution
Build a report scheduling and delivery system with customizable templates.

### Implementation Details
- **Report templates:** Define configurable report types:
  - **Catalog Health Report:** metadata completeness, missing identifiers, enrichment suggestions
  - **Revenue Summary:** period-over-period by society, territory, and work
  - **Audit Findings Report:** open findings, recovery progress, estimated total impact
  - **Registration Status Report:** pending/confirmed/rejected registrations across societies
  - **Writer Royalty Statement:** per-writer earnings breakdown with split details
- **Scheduling:** Add a `ScheduledReport` model (template, frequency: WEEKLY/MONTHLY/QUARTERLY, recipients[], format: PDF/CSV/XLSX, lastSentAt).
- **Delivery:** BullMQ recurring job that generates reports and delivers via:
  - Email (with PDF/CSV attachment)
  - In-app notification with download link
  - Webhook (for API integrations — ties into Feature #8)
- **Custom branding:** Allow organizations to upload their logo and set colors for white-labeled PDF reports (useful for publisher → writer communications).
- Create a `/dashboard/reports/scheduled` page for managing report schedules.
- Extend the existing `jsPDF` + `jspdf-autotable` setup to support all report types with consistent styling.

### Impact
- **Professional Output:** Publishers can send branded, automated reports to writers and stakeholders.
- **Compliance:** Regular reporting demonstrates active catalog management to PROs.

---

## Priority Matrix

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 1 | Real-Time WebSocket Notifications | Medium | High | 🔴 P0 |
| 2 | AI-Powered Smart Matching | Medium | Very High | 🔴 P0 |
| 3 | Historical Trend Analytics | Medium | High | 🔴 P0 |
| 9 | Test Coverage Expansion | Medium | Very High | 🔴 P0 |
| 4 | Automated Statement Ingestion | High | Very High | 🟠 P1 |
| 7 | Collaborator Portal Enhancement | Medium | High | 🟠 P1 |
| 11 | Bulk Operations UI | Low-Medium | High | 🟠 P1 |
| 8 | Public API & Webhooks | High | Very High | 🟡 P2 |
| 10 | Multi-Currency Support | Medium | High | 🟡 P2 |
| 12 | Advanced Reporting | Medium | Medium | 🟡 P2 |
| 6 | Content ID Monitoring | High | High | 🟢 P3 |
| 5 | Blockchain-Anchored Audit Trail | Medium | Medium | 🟢 P3 |

---

## Conclusion

RoyaltyRadar has an exceptionally strong foundation: clean separation of concerns across domain engines, a comprehensive Prisma schema that anticipates growth, robust security with CSP/CSRF/RBAC, and professional-grade UI with dark mode support. The recommendations above are designed to push the platform from a powerful audit tool into a **complete revenue intelligence and catalog management platform** — the kind of product that becomes indispensable to every independent publisher's daily workflow.

The P0 items (real-time updates, smart matching, analytics, and test coverage) should be tackled first as they directly improve core product value and engineering confidence. The P1 tier (automation, collaboration, bulk ops) amplifies user productivity. The P2/P3 tier (API platform, multi-currency, Content ID, blockchain) positions the product for enterprise scale and international expansion.