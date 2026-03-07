# MLC Matching Tool Research Report

## Executive Summary

The Mechanical Licensing Collective (MLC) Matching Tool is a critical component of the U.S. music royalty ecosystem, created under the Music Modernization Act (MMA) to help rights holders identify and claim undistributed mechanical royalties. This report provides a comprehensive analysis of the tool, its capabilities, integration opportunities, and competitive landscape.

---

## 1. What is the MLC?

### 1.1 Organization Overview

The Mechanical Licensing Collective (MLC) is a designation by the U.S. Copyright Office pursuant to the Orrin G. Hatch-Bob Goodlatte Music Modernization Act (MMA). The MLC's primary mission is to:

- Administer blanket mechanical licenses for eligible streaming and download services (DSPs)
- Collect royalties due under those licenses
- Pay music publishers, administrators, ex-U.S. collective management organizations (CMOs), and self-administered songwriters, composers, and lyricists

### 1.2 Key Statistics

| Metric | Value |
|--------|-------|
| Historical unmatched "black box" royalties received | $424 Million |
| Undistributed royalties currently waiting to be claimed | ~$200 Million |
| Coverage | All digital audio streaming and download services in the U.S. |

---

## 2. MLC Matching Tool - Core Functionality

### 2.1 What is the Matching Tool?

The MLC Matching Tool allows Members (publishers, administrators, and self-administered songwriters) to match sound recordings identified by ISRCs (International Standard Recording Codes) to musical works (compositions) in the MLC's database.

### 2.2 How It Works

- **Data Source**: DSPs (Digital Service Providers) provide usage reports monthly containing ISRCs of recordings streamed
- **Automated Matching**: MLC runs automated matching processes to connect recordings to registered works
- **Unmatched Recordings**: When the automated system cannot find a match, these recordings appear in the Matching Tool
- **Manual Matching**: Members can search, review, and manually match recordings to their registered works
- **Royalty Distribution**: Once matched, royalties flow to the appropriate rights holders

### 2.3 Key Features

| Feature | Description |
|---------|-------------|
| ISRC-to-Work Matching | Connects sound recording identifiers to composition registrations |
| Bulk Matching | Supports batch processing of multiple recordings |
| Search Functionality | Advanced search by ISRC, title, artist, and other metadata |
| Claim Generation | Creates pre-populated claim forms for submission |
| Historical Data | Access to historical unmatched recordings data |

### 2.4 Data Flow Process

```
DSP Usage Reports → MLC Processing → Automated Matching Attempt
                                              ↓
                                    Unmatched ISRCs
                                              ↓
                              Matching Tool (Member Review)
                                              ↓
                              Manual Match/Claim Submission
                                              ↓
                                    Royalty Distribution
```

---

## 3. MLC Tool Suite

The Matching Tool is part of a comprehensive suite of tools offered by the MLC:

### 3.1 Member Tools

| Tool | Purpose |
|------|---------|
| Matching Tool | Connect unmatched recordings to registered works |
| Claiming Tool | Claim ownership of registered works |
| Works Registration Tool | Register new musical works |
| Catalog Management | Manage and update work registrations |
| Royalty Portal | View and manage royalty distributions |

### 3.2 Data Programs

| Program | Description |
|---------|-------------|
| Bulk Data Access | Subscription API access to MLC data for enterprise users |
| Public Search API | Public API for searching the MLC database |
| DURP (Distributor Unmatched Recordings Portal) | Allows distributors to access unmatched recordings data |
| DQI (Data Quality Initiative) | Partnership program for software vendors to improve data quality |

---

## 4. Supplemental Matching Network

The MLC has established partnerships with third-party data matching companies to improve matching rates. These partners form the Supplemental Matching Network:

### 4.1 Network Partners

| Partner | Specialization |
|---------|---------------|
| Blokur | Music rights data platform, conflict resolution, matching algorithms |
| Jaxsta | Official music credit database, metadata verification |
| Pex | Content identification and licensing, audio fingerprinting |
| Salt | High-speed rights and royalties network, data matching |
| SX Works | Global publisher services, catalog administration |

### 4.2 How the Network Works

Members can opt to have their unmatched recordings data shared with network partners, who use their proprietary algorithms and databases to find additional matches beyond what the MLC's automated system can achieve.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors & Alternatives

Several companies offer services that compete with or complement the MLC Matching Tool:

#### 5.1.1 RightsHolder.io (MLC ClaimAssist)

**Overview**: AI-powered service specifically designed to find undistributed royalties at the MLC.

| Aspect | Details |
|--------|---------|
| Primary Product | MLC ClaimAssist |
| Core Function | Identifies unclaimed royalties and generates pre-populated claim forms |
| Target Users | Independent publishers, legacy catalog owners, investment funds |
| Pricing Model | Flat fee (users keep 100% of royalties) |
| Data Formats Accepted | CWR, TSV, CSV, Excel, Google Sheets, PDFs |
| Unique Features | AI-powered matching, multi-admin coordination, continuous monitoring |

**Key Value Propositions:**
- Unlock hidden income from undistributed royalties
- Eliminate hours of manual research
- Maximize catalog value for investors
- Automated monitoring of new registrations

#### 5.1.2 BMAT Music Innovators

**Overview**: Global music technology company providing DSP processing and royalty matching services.

| Aspect | Details |
|--------|---------|
| Primary Product | DSP Processing |
| Core Function | Process usage reports, match recordings to works, generate distribution files |
| Target Users | CMOs (Collective Management Organizations), Publishers, PROs |
| Key Metrics | 30 billion matches processed daily, 20% more matches vs. competitors, 95%+ match rate for top 50% usage, 72-hour processing cycle |
| Notable Clients | SACEM, SGAE, SIAE, KODA, and others |

**Key Differentiators:**
- Audio fingerprinting technology
- Machine learning with human expertise
- Evidence-based claiming with CISAC IPI integration
- Supports DSR ingestion from 80+ DSPs worldwide

#### 5.1.3 Salt

**Overview**: British music rights fintech company providing high-speed rights and royalties network.

| Aspect | Details |
|--------|---------|
| Primary Product | Rights & Royalties Processing Platform |
| Core Function | Process usage, match ownership, calculate distributions |
| Target Users | CMOs, Publishers |
| Notable Investors | Björn Ulvaeus (ABBA), Dave Stewart (Eurythmics), Quincy Jones |
| Key Contract | 10-year deal with BumaStemra (€3bn+ processing) |
| MLC Relationship | Official MLC data matching partner |

**Key Differentiators:**
- Cloud-powered speed and accuracy
- Session app for metadata capture during creation
- Plugs into existing back-office systems
- Focus on eliminating "black box" royalties (£500M/year globally)

#### 5.1.4 Blokur (Acquired by Music Reports)

**Overview**: Music rights platform focused on unlocking trapped income through advanced matching.

| Aspect | Details |
|--------|---------|
| Primary Product | Music Rights Platform |
| Core Function | Match usages, resolve conflicts, license music |
| Database Size | 30M+ compositions, 200M+ recordings |
| Performance | 6.1x better matching improvement |
| Target Users | Music Publishers, Apps & Services |
| MLC Relationship | Official MLC Supplemental Matching Network partner |

**Key Differentiators:**
- Conflict detection and resolution
- Sub-graph royalty matching
- Clean and enrich data capabilities
- Direct licensing marketplace

#### 5.1.5 Other Competitors

| Company | Focus Area |
|---------|-----------|
| Revelator | Distribution, rights management, royalty accounting |
| Remetrik | Back-office solution for labels, publishers, distributors |
| Session Studio | Creator metadata capture during music creation |
| Soundreef | Royalty collection and rights management |
| Audoo | Public performance royalty reporting using music recognition |

---

## 6. Comparison Matrix

### 6.1 Feature Comparison

| Feature | MLC Matching Tool | RightsHolder.io | BMAT | Salt | Blokur |
|---------|-------------------|-----------------|------|------|--------|
| Free to Use | ✅ | ❌ (flat fee) | ❌ | ❌ | Freemium |
| Direct MLC Integration | ✅ Native | ✅ Via API | ❌ | ✅ Partner | ✅ Partner |
| AI-Powered Matching | Partial | ✅ | ✅ | ✅ | ✅ |
| Bulk Processing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Continuous Monitoring | ❌ | ✅ | ✅ | ✅ | ✅ |
| Audio Fingerprinting | ❌ | ❌ | ✅ | ❌ | ❌ |
| Conflict Resolution | ❌ | ❌ | ✅ | ✅ | ✅ |
| API Access | ✅ | ✅ | ✅ | ✅ | ✅ |
| Global Coverage | U.S. Only | U.S. Focus | Global | Global | Global |

### 6.2 Pricing Models

| Provider | Pricing Model | Typical Cost |
|----------|--------------|--------------|
| MLC Matching Tool | Free | $0 |
| RightsHolder.io | Flat fee | Varies (keeps 100% royalties) |
| BMAT | Enterprise licensing | Custom |
| Salt | Enterprise licensing | Custom |
| Blokur | Freemium | Free tier available |

---

## 7. Integration Opportunities for RoyaltyRadar

### 7.1 Direct Integration Options

#### 7.1.1 MLC Public Search API
- **Use Case**: Verify work registrations, check ownership data
- **Integration Complexity**: Low
- **Data Available**: Work metadata, ownership percentages

#### 7.1.2 MLC Bulk Data Access Subscription
- **Use Case**: Enterprise access to full MLC database
- **Integration Complexity**: Medium
- **Data Available**: Comprehensive work and recording data

#### 7.1.3 DURP (Distributor Unmatched Recordings Portal)
- **Use Case**: Access unmatched recordings for distributor clients
- **Integration Complexity**: Medium
- **Data Available**: Unmatched ISRCs with usage data

### 7.2 Partnership Opportunities

#### 7.2.1 DQI (Data Quality Initiative) Partner Program
- Join as a software vendor partner
- Contribute to improving industry data quality
- Gain early access to new MLC tools and data

#### 7.2.2 Supplemental Matching Network
- Apply to become a matching partner
- Leverage RoyaltyRadar's existing matching algorithms
- Provide value-add to MLC members

### 7.3 Recommended Implementation Strategy

| Phase | Action | Timeline |
|-------|--------|----------|
| Phase 1 | Integrate MLC Public Search API for work verification | Immediate |
| Phase 2 | Implement Bulk Data Access for comprehensive catalog auditing | Short-term |
| Phase 3 | Apply for DQI Partner Program status | Medium-term |
| Phase 4 | Consider Supplemental Matching Network application | Long-term |

---

## 8. Best Practices for Using the MLC Matching Tool

### 8.1 Registration Best Practices

- **Register works completely** - Include all writers, publishers, and ownership splits
- **Use standard identifiers** - ISWC, IPI, and proper metadata
- **Register early** - Register works before they're streamed to avoid unmatched royalties

### 8.2 Matching Tool Best Practices

- **Regular reviews** - Check the Matching Tool monthly for new unmatched recordings
- **Bulk matching** - Use bulk features for efficiency with large catalogs
- **Accurate associations** - Ensure ISRC-to-work associations are correct
- **Documentation** - Keep records of all matches for audit purposes

### 8.3 Data Quality Tips

- **Clean catalog data** - Ensure your catalog metadata is accurate and complete
- **Standard formats** - Use CWR (Common Works Registration) for bulk registrations
- **Cross-reference** - Compare your data against multiple sources (PROs, MLC, SoundExchange)
- **Monitor continuously** - Set up processes to regularly check for unmatched usages

---

## 9. Industry Context & Market Size

### 9.1 The "Black Box" Problem

| Metric | Value |
|--------|-------|
| Global Scale | Estimated £500M ($624M) annually in unclaimed/misallocated royalties worldwide |
| U.S. Context | ~$200M currently undistributed at the MLC |

**Root Causes:**
- Incomplete or missing metadata
- Multiple versions of same song with different titles
- Cover songs and interpolations
- Transliteration issues
- Multiple rights holders with conflicting ownership claims

### 9.2 Market Drivers

- **Streaming Growth**: 140,000+ tracks added to Spotify daily
- **Catalog Acquisitions**: Increased investment in music catalogs requiring comprehensive audit
- **Regulatory Changes**: MMA created MLC, similar initiatives in other markets
- **Technology Adoption**: AI and machine learning enabling better matching

---

## 10. Conclusions & Recommendations

### 10.1 Key Takeaways

- The MLC Matching Tool is a free, essential resource for any U.S. music rights holder
- Supplemental Matching Network partners provide additional value through advanced matching
- Commercial alternatives (RightsHolder.io, BMAT, Salt, Blokur) offer enhanced features for enterprise users
- Integration with MLC tools can significantly enhance RoyaltyRadar's audit capabilities

### 10.2 Strategic Recommendations for RoyaltyRadar

| Priority | Action | Impact |
|----------|--------|--------|
| **High** | Integrate MLC Public Search API | Immediate value for catalog verification |
| **High** | Implement MLC data as data source in audit engine | Enhance audit comprehensiveness |
| **Medium** | Join DQI Partner Program | Industry recognition, early access |
| **Medium** | Build automated MLC unmatched monitoring | Continuous royalty recovery |
| **Low** | Consider Supplemental Matching Network application | Long-term partnership opportunity |

---

## References & Sources

- MLC Help Center: What is the Matching Tool
- MLC Official Announcements: Supplemental Matching Network
- MLC Data Programs Documentation
- Billboard: "MLC Aims to Improve Royalties Match Rate With New Data Network"
- RightsHolder.io Official Website
- BMAT DSP Processing Documentation
- Salt Official Website
- Blokur Official Website
- CB Insights: SX Works Competitors Analysis

---

**Report compiled:** January 2025
**Research conducted for:** RoyaltyRadar enhancement initiative