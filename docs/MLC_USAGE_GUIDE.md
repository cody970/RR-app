# How to Use the MLC Matching Tool Integration

## RoyaltyRadar × The MLC — Practical Usage Guide

---

## Table of Contents

1. [Quick Start — What You Need](#1-quick-start--what-you-need)
2. [Dashboard Walkthrough](#2-dashboard-walkthrough)
3. [API Reference](#3-api-reference)
4. [Automated Catalog Scanning](#4-automated-catalog-scanning)
5. [Recovering Unclaimed Royalties — Step-by-Step Workflow](#5-recovering-unclaimed-royalties--step-by-step-workflow)
6. [Architecture & How It All Fits Together](#6-architecture--how-it-all-fits-together)
7. [Troubleshooting & Health Monitoring](#7-troubleshooting--health-monitoring)

---

## 1. Quick Start — What You Need

### Environment Variables

Add these to your `.env` (see `.env.example`):

```env
# Required for Bulk Data API (enterprise catalog auditing)
MLC_API_KEY=your_mlc_api_key_here
MLC_API_URL=https://portal.themlc.com/api/v1

# Required for DURP access (unmatched recordings portal)
MLC_DURP_KEY=your_mlc_durp_key_here
MLC_DURP_URL=https://portal.themlc.com/api/v1/durp

# Optional — legacy portal automation
MLC_PORTAL_EMAIL=your_mlc_portal_email_here
MLC_PORTAL_PASSWORD=your_mlc_portal_password_here
```

### Access Tiers — What Works Without Keys

| Feature | No Keys | MLC_API_KEY | MLC_DURP_KEY |
|---|---|---|---|
| Public Search (title lookup) | ✅ | ✅ | — |
| Bulk Data API (ISRC/ISWC matching) | ❌ | ✅ | — |
| DURP Unmatched Recordings | ❌ | — | ✅ |
| DURP Cross-Reference | ❌ | — | ✅ |
| Unclaimed Royalties Check | ❌ | ✅ | — |
| Claim Submission | ❌ | ✅ | — |

**You can start immediately** with the Public Search (no API key needed). It uses The MLC's public search at `themlc.com/search` to verify works by title. For full power, enroll in the MLC Bulk Data Access program and/or the DURP distributor program.

### How to Get API Keys

1. **MLC Bulk Data API Key** — Apply at [themlc.com](https://www.themlc.com) → Portal → Bulk Data Access Program. Requires publisher/administrator enrollment.
2. **DURP Key** — Apply through the Distributor Unmatched Recordings Portal. Requires distributor-level access.

---

## 2. Dashboard Walkthrough

Navigate to: **`/dashboard/mlc-matching`**

The dashboard has **three tabs** and a **health status bar** at the top.

### Health Status Bar

At the top of the page, four cards show real-time system health:

| Card | What It Shows |
|---|---|
| **Bulk API** | Circuit breaker state (CLOSED = healthy, OPEN = failing, HALF_OPEN = recovering) |
| **Public Search** | Circuit breaker state for the free public search endpoint |
| **DURP** | Circuit breaker state for the Distributor Unmatched Recordings Portal |
| **Configuration** | Whether `MLC_API_KEY` and `MLC_DURP_KEY` are configured |

### Tab 1: Matching Jobs

This is your **bulk matching command center**.

**How to use it:**

1. Click **"Run Bulk Match"** to start a new matching job
2. The system pulls up to 50 works from your catalog (configurable via API)
3. For each work, it tries a 3-tier matching strategy:
   - **ISRC match** → fastest, most accurate (connects sound recording to composition)
   - **ISWC match** → fallback using the International Standard Work Code
   - **Title + Writer match** → last resort, fuzzy text matching
4. Results appear in the jobs table with status, match count, and match rate
5. Jobs auto-refresh every 15 seconds

**What the results tell you:**

- **Match Rate** — Percentage of your catalog that has confirmed MLC registrations
- **Unmatched Works** — These are potential revenue leaks (royalties going to the "black box")
- **Status** — `COMPLETED`, `RUNNING`, `FAILED`, or `PENDING`

### Tab 2: Search MLC

This is your **single-work lookup tool**.

**How to use it:**

1. Enter any combination of:
   - **Title** — Song or composition title
   - **ISRC** — Sound recording identifier (e.g., `USRC17607839`)
   - **ISWC** — Work identifier (e.g., `T-345246800-1`)
   - **Writer** — Songwriter/composer name
2. Click **"Search MLC"**
3. Results show matching works with:
   - Work title and ISWC
   - Writers and publishers listed
   - Registration status and claim status
   - Whether royalties are being collected or sitting unclaimed

**Use cases:**

- Verify a specific song is registered with The MLC before release
- Check if a competitor has claimed your work
- Look up writer/publisher splits on a composition
- Investigate why royalties aren't flowing for a particular track

### Tab 3: Unclaimed Royalties

This is your **money recovery dashboard**.

**How to use it:**

1. Click **"Check Unclaimed"**
2. The system queries The MLC for works associated with your publisher ID that have unclaimed mechanical royalties
3. Results show:
   - **Estimated unclaimed amount** — Dollar value of royalties sitting in the black box
   - **Number of unmatched works** — How many of your works need attention
   - **Last checked timestamp** — When the data was last refreshed

**Why this matters:** The MLC holds approximately **$200M+ in unmatched royalties**. If your catalog has unregistered or incorrectly registered works, you're leaving money on the table.

---

## 3. API Reference

### Base URL

```
POST /api/mlc-matching
GET  /api/mlc-matching
```

All requests require authentication (NextAuth session with `orgId`).

### Rate Limiting

- **5 requests per 10 minutes** per organization
- Returns `429 Too Many Requests` when exceeded

### GET — List Matching Jobs

```bash
curl -X GET /api/mlc-matching \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "clx...",
      "status": "COMPLETED",
      "totalWorks": 50,
      "matchesFound": 38,
      "createdAt": "2025-01-15T...",
      "_count": { "results": 50 }
    }
  ],
  "correlationId": "uuid"
}
```

### POST — Trigger Matching Operations

#### Mode: `health`

Check system health and circuit breaker states.

```bash
curl -X POST /api/mlc-matching \
  -H "Content-Type: application/json" \
  -d '{"mode": "health"}'
```

#### Mode: `single`

Search for a single work.

```bash
curl -X POST /api/mlc-matching \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "single",
    "title": "Shape of You",
    "writer": "Ed Sheeran",
    "isrc": "GBAHS1600463"
  }'
```

#### Mode: `bulk`

Run bulk matching against your entire catalog.

```bash
curl -X POST /api/mlc-matching \
  -H "Content-Type: application/json" \
  -d '{"mode": "bulk", "limit": 100}'
```

#### Mode: `unclaimed`

Check for unclaimed royalties.

```bash
curl -X POST /api/mlc-matching \
  -H "Content-Type: application/json" \
  -d '{"mode": "unclaimed"}'
```

#### Mode: `durp-crossref`

Cross-reference your catalog against DURP unmatched recordings.

```bash
curl -X POST /api/mlc-matching \
  -H "Content-Type: application/json" \
  -d '{"mode": "durp-crossref", "limit": 200}'
```

**Response:**
```json
{
  "mode": "durp-crossref",
  "potentialMatches": [
    {
      "catalogItem": { "title": "...", "isrc": "..." },
      "unmatchedRecording": { "title": "...", "usage": 15000 },
      "confidence": 0.85
    }
  ],
  "totalChecked": 200,
  "matchesFound": 12,
  "correlationId": "uuid"
}
```

---

## 4. Automated Catalog Scanning

The MLC integration is **already wired into the Catalog Scanner** (`src/lib/music/catalog-scanner.ts`). When you run a catalog scan, **Phase 3** automatically:

1. Checks each work in your catalog against The MLC
2. Uses `searchMLCByTitle()` with the work title and primary writer
3. Identifies two types of gaps:
   - **Not Found** → Work is not registered with The MLC at all (registration gap)
   - **Unclaimed** → Work exists but royalties are unclaimed (revenue recovery opportunity)
4. Creates `registrationGap` records with `society: "MLC"` and estimated financial impact

**This means every time you run a catalog audit, MLC gaps are automatically detected.** No extra steps needed — just make sure `MLC_API_KEY` is set in your environment.

---

## 5. Recovering Unclaimed Royalties — Step-by-Step Workflow

Here is the recommended workflow for maximizing royalty recovery:

### Step 1: Initial Audit (Day 1)

1. Go to `/dashboard/mlc-matching`
2. Click **"Run Bulk Match"** on the Matching Jobs tab
3. Wait for the job to complete (watch the auto-refreshing table)
4. Note your **match rate** — anything below 95% means potential revenue leakage

### Step 2: Identify Gaps (Day 1)

1. Switch to the **Unclaimed Royalties** tab
2. Click **"Check Unclaimed"**
3. Record the estimated unclaimed amount and number of unmatched works
4. Switch to **Search MLC** tab and look up specific unmatched works to understand why they are missing

### Step 3: DURP Cross-Reference (Day 2)

If you have DURP access:

1. Use the API to run a DURP cross-reference:
   ```bash
   POST /api/mlc-matching
   {"mode": "durp-crossref", "limit": 500}
   ```
2. Review `potentialMatches` — these are recordings using your compositions that are not matched
3. High-confidence matches (>0.8) are strong candidates for immediate claims

### Step 4: Submit Claims (Day 3+)

For each identified gap:

1. Verify the work details (title, writers, publishers, splits)
2. Use the `submitClaim()` function programmatically or submit through The MLC portal
3. Track claim status through the dashboard

### Step 5: Ongoing Monitoring (Weekly)

1. Run bulk matching weekly to catch new releases
2. Monitor the Unclaimed Royalties tab for changes
3. Use `monitorNewUnmatched()` to get alerts on newly unmatched recordings
4. The catalog scanner automatically checks MLC gaps on every audit run

---

## 6. Architecture & How It All Fits Together

```
+-----------------------------------------------------------+
|                    Dashboard UI                            |
|              /dashboard/mlc-matching                       |
|   +----------+  +----------+  +---------------+           |
|   |  Jobs Tab |  |Search Tab|  |Unclaimed Tab  |          |
|   +-----+----+  +-----+----+  +-------+-------+          |
|         |              |               |                   |
+---------+--------------+---------------+-------------------+
          |              |               |
          v              v               v
+-----------------------------------------------------------+
|              API Route: /api/mlc-matching                  |
|   +------+ +------+ +---------+ +------+ +------+        |
|   | bulk | |single| |unclaimed| | durp | |health|        |
|   +--+---+ +--+---+ +----+----+ +--+---+ +--+---+        |
|      |        |          |         |        |              |
|   Rate Limiting (5 req / 10 min per org)                  |
|   Zod Validation - Correlation ID Tracking                |
+------+--------+----------+---------+--------+-------------+
       |        |          |         |        |
       v        v          v         v        v
+-----------------------------------------------------------+
|              MLC Client: mlc-client.ts                     |
|                                                            |
|   +-----------------+  +----------------------+           |
|   | Circuit Breakers|  |  Retry with Backoff  |           |
|   | - Bulk API      |  |  - 3 attempts        |           |
|   | - Public Search |  |  - Exponential delay  |           |
|   | - DURP          |  |  - Jitter             |           |
|   +--------+--------+  +-----------+----------+           |
|            |                       |                       |
|   +--------v-----------------------v-----------+          |
|   |  3-Tier Matching Strategy                  |          |
|   |  1. ISRC -> Work (fastest, most accurate)  |          |
|   |  2. ISWC -> Work (fallback)                |          |
|   |  3. Title + Writer -> Work (last resort)   |          |
|   +--------------------------------------------+          |
|                                                            |
|   Functions:                                               |
|   - searchMLCByTitle()    - bulkMatchRecordings()         |
|   - searchMLCByISRC()     - fetchDURPUnmatchedRecordings()|
|   - searchMLCByISWC()     - crossReferenceCatalogWithDURP()|
|   - checkUnclaimedRoyalties() - monitorNewUnmatched()     |
|   - submitClaim()         - getMLCClientHealth()          |
+----------------------------+------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|              External MLC APIs                             |
|   - Public Search: themlc.com/search (no key needed)      |
|   - Bulk Data API: portal.themlc.com/api/v1               |
|   - DURP: portal.themlc.com/api/v1/durp                   |
+-----------------------------------------------------------+

Also integrated into:
+-----------------------------------------------------------+
|  Catalog Scanner (catalog-scanner.ts)                      |
|  Phase 3 automatically checks MLC registration gaps       |
|  Creates registrationGap records with society: "MLC"      |
+-----------------------------------------------------------+
```

---

## 7. Troubleshooting & Health Monitoring

### Circuit Breaker States

| State | Meaning | Action |
|---|---|---|
| **CLOSED** | Healthy — requests flowing normally | None needed |
| **OPEN** | Too many failures — requests blocked | Wait for auto-recovery (30-60s) or check MLC API status |
| **HALF_OPEN** | Testing recovery — limited requests | System is self-healing, monitor |

### Common Issues

**"Unauthorized" (401)**
- Ensure you are logged in with a valid session
- Your user must have an `orgId` associated

**"Rate limited" (429)**
- You have exceeded 5 requests per 10 minutes
- Wait and retry, or batch your operations

**"Circuit breaker OPEN"**
- The MLC API is experiencing issues
- Check [MLC status page](https://www.themlc.com) for outages
- The system will auto-recover when the API stabilizes

**"No MLC_API_KEY configured"**
- Public search still works (title lookups)
- For bulk matching, ISRC/ISWC lookups, and unclaimed checks, you need the API key
- Enroll in the MLC Bulk Data Access program

**Low match rates (<80%)**
- Check data quality: Are ISRCs and ISWCs populated in your catalog?
- Run single searches on unmatched works to diagnose
- Some works may genuinely not be registered — these are your recovery opportunities

### Monitoring Endpoints

Use the health check mode for automated monitoring:

```bash
# Quick health check
curl -X POST /api/mlc-matching -d '{"mode": "health"}'

# Response includes circuit breaker states and configuration status
```

---

## Summary — Quick Reference

| What You Want To Do | How To Do It |
|---|---|
| Check if a song is registered | Dashboard -> Search MLC tab -> enter title/ISRC |
| Audit your entire catalog | Dashboard -> Matching Jobs tab -> "Run Bulk Match" |
| Find unclaimed money | Dashboard -> Unclaimed Royalties tab -> "Check Unclaimed" |
| Cross-reference with DURP | API: `POST /api/mlc-matching {"mode": "durp-crossref"}` |
| Check system health | API: `POST /api/mlc-matching {"mode": "health"}` |
| Automatic gap detection | Just run a catalog scan — MLC checks are built in |
| Submit a claim | Programmatic: `submitClaim()` from mlc-client.ts |

---

*Built for RoyaltyRadar by NinjaTech AI — January 2025*
*See also: `docs/research/MLC_Matching_Tool_Research_Report.md` and `docs/research/MLC_Integration_Roadmap.md`*
