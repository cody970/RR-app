# MLC Integration Roadmap for RoyaltyRadar

**Date:** March 2026
**Based on:** MLC Matching Tool Research Report (January 2025)
**Status:** Implementation Phase 1 Complete

---

## Overview

This document outlines the strategic roadmap for integrating The MLC's (Mechanical Licensing Collective) tools and data programs into the RoyaltyRadar platform. The integration aims to maximize royalty recovery for users by leveraging MLC's matching tools, DURP portal, and bulk data access programs.

---

## Phase 1: Core MLC Client Enhancement ✅ COMPLETE

### Deliverables
- **Enhanced MLC Client** (`src/lib/clients/mlc-client.ts`)
  - Circuit breaker protection for all MLC API calls
  - Retry logic with exponential backoff
  - ISRC-to-Work matching via `searchMLCByISRC()`
  - ISWC-based work lookup via `searchMLCByISWC()`
  - Title + writer fuzzy search via `searchMLCByTitle()`
  - Bulk matching engine via `bulkMatchRecordings()`
  - DURP integration via `fetchDURPUnmatchedRecordings()`
  - Catalog cross-reference via `crossReferenceCatalogWithDURP()`
  - Unclaimed royalty monitoring via `checkUnclaimedRoyalties()`
  - New unmatched monitoring via `monitorNewUnmatched()`
  - Claim submission via `submitClaim()`
  - Health monitoring via `getMLCClientHealth()`

- **MLC Matching API** (`src/app/api/mlc-matching/route.ts`)
  - Multi-mode matching: bulk, single, unclaimed, DURP cross-reference, health
  - Rate limiting (5 requests per 10 minutes per org)
  - Zod validation for all request parameters
  - Correlation ID tracking for debugging
  - Comprehensive error handling

- **MLC Matching Dashboard** (`src/app/dashboard/mlc-matching/page.tsx`)
  - Tabbed interface: Matching Jobs, Search MLC, Unclaimed Royalties
  - Real-time health status cards with circuit breaker states
  - Single search by title, ISRC, or ISWC
  - Bulk matching job management
  - Unclaimed royalties monitoring with estimated amounts
  - Match rate visualization

### Environment Variables Required
```env
# MLC Bulk Data API (requires enrollment)
MLC_API_KEY=your_mlc_api_key
MLC_API_URL=https://portal.themlc.com/api/v1

# MLC DURP Portal (requires distributor enrollment)
MLC_DURP_KEY=your_durp_key
MLC_DURP_URL=https://portal.themlc.com/api/v1/durp
```

---

## Phase 2: Automated Monitoring (Planned)

### Objective
Implement continuous monitoring for newly unmatched recordings and unclaimed royalties, with automated notifications to users.

### Deliverables
- **Scheduled MLC Monitor Worker**
  - Daily scan for new unmatched recordings
  - Weekly unclaimed royalties check
  - Automated email/in-app notifications when new matches found
  - Integration with existing BullMQ job queue

- **MLC Monitor Dashboard Widget**
  - Summary card on main dashboard showing MLC status
  - Trend chart of matched vs. unmatched over time
  - Alert badges for new unclaimed royalties

### Technical Requirements
- BullMQ scheduled job for daily/weekly monitoring
- Redis caching for MLC data (1-hour TTL)
- Notification integration with existing `notifyOrg()` system
- Database tables for monitoring history and trends

---

## Phase 3: DQI Partner Program Integration (Planned)

### Objective
Apply for and integrate with the MLC's Data Quality Initiative (DQI) Partner Program to gain early access to new tools and contribute to industry data quality.

### Benefits
- Industry recognition as a certified MLC partner
- Early access to new MLC tools and APIs
- Ability to contribute data quality improvements
- Enhanced credibility with publishers and rights holders

### Requirements
- Demonstrate data quality capabilities
- Implement MLC data standards
- Provide regular data quality reports
- Maintain minimum matching accuracy thresholds

---

## Phase 4: Supplemental Matching Network (Future)

### Objective
Apply to become an official MLC Supplemental Matching Network partner, alongside companies like Blokur, Jaxsta, Pex, Salt, and SX Works.

### Benefits
- Access to unmatched recordings data directly from MLC
- Ability to submit matches on behalf of members
- Revenue opportunity through matching services
- Strategic positioning in the music rights ecosystem

### Requirements
- Proven matching algorithm with high accuracy
- Demonstrated scale (processing volume)
- Data security and privacy compliance
- API integration with MLC systems

### Competitive Positioning
RoyaltyRadar's existing capabilities that support this application:
- Fuzzy matching engine (`src/lib/finance/fuzzy-match.ts`)
- Multi-source enrichment (Spotify, MusicBrainz, Muso.ai)
- Catalog scanning engine (`src/lib/music/catalog-scanner.ts`)
- CWR generation capabilities (`src/lib/cwr/cwr-generator.ts`)

---

## Phase 5: Advanced Analytics & Reporting (Future)

### Objective
Build comprehensive analytics around MLC data to provide actionable insights for publishers and rights holders.

### Features
- **Royalty Recovery Dashboard**: Track total royalties recovered through MLC matching
- **Gap Analysis Reports**: Identify works missing MLC registration
- **Competitive Benchmarking**: Compare matching rates against industry averages
- **Revenue Forecasting**: Estimate potential royalties from unmatched recordings
- **Audit Trail**: Complete history of all MLC interactions and claims

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RoyaltyRadar App                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard    │  │  API Routes  │  │  Workers     │  │
│  │  (React)      │  │  (Next.js)   │  │  (BullMQ)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │           │
│         └──────────┬───────┘──────────┬──────┘           │
│                    │                  │                    │
│         ┌──────────▼──────────────────▼──────────┐       │
│         │         MLC Client (Enhanced)           │       │
│         │  - Circuit Breakers                     │       │
│         │  - Retry Logic                          │       │
│         │  - Rate Limiting                        │       │
│         │  - Correlation ID Tracking              │       │
│         └──────────┬──────────┬──────────┬───────┘       │
│                    │          │          │                 │
└────────────────────┼──────────┼──────────┼────────────────┘
                     │          │          │
          ┌──────────▼───┐ ┌───▼────┐ ┌───▼──────────┐
          │ MLC Bulk API │ │ Public │ │ DURP Portal  │
          │ (Enterprise) │ │ Search │ │ (Distributor)│
          └──────────────┘ └────────┘ └──────────────┘
```

---

## Competitive Advantages

### vs. RightsHolder.io (MLC ClaimAssist)
- **RoyaltyRadar**: Full-stack audit platform with MLC as one data source
- **RightsHolder.io**: MLC-only focused tool
- **Advantage**: Broader value proposition, multi-source auditing

### vs. BMAT
- **RoyaltyRadar**: Publisher/label focused, self-service
- **BMAT**: CMO-focused, enterprise licensing
- **Advantage**: More accessible to independent publishers

### vs. Salt
- **RoyaltyRadar**: Comprehensive audit + matching
- **Salt**: Processing platform for CMOs
- **Advantage**: Direct-to-publisher model, lower barrier to entry

### vs. Blokur (Music Reports)
- **RoyaltyRadar**: Active monitoring + audit
- **Blokur**: Data platform + conflict resolution
- **Advantage**: Proactive royalty recovery, integrated workflow

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| MLC Match Rate | >75% | Matched / Total submitted |
| Unclaimed Recovery | >$50K/quarter | Royalties recovered per quarter |
| User Adoption | >60% | Users running MLC matching monthly |
| API Uptime | >99.5% | Circuit breaker healthy state |
| Processing Speed | <5min for 500 items | Bulk matching completion time |

---

## Timeline

| Phase | Timeline | Status |
|-------|----------|--------|
| Phase 1: Core Client Enhancement | Q1 2026 | ✅ Complete |
| Phase 2: Automated Monitoring | Q2 2026 | 🔜 Planned |
| Phase 3: DQI Partner Program | Q3 2026 | 📋 Planned |
| Phase 4: Supplemental Matching Network | Q4 2026 | 📋 Planned |
| Phase 5: Advanced Analytics | Q1 2027 | 📋 Planned |

---

## References

- [MLC Matching Tool Research Report](./MLC_Matching_Tool_Research_Report.md)
- [MLC Official Website](https://www.themlc.com)
- [MLC Data Programs](https://www.themlc.com/data-programs)
- [Music Modernization Act](https://www.congress.gov/bill/115th-congress/house-bill/1551)