/**
 * Discrepancy Engine
 *
 * Runs analysis on imported statement data to detect:
 * - Missing works: catalog works absent from statements
 * - Rate anomalies: per-use rates below society averages
 * - Revenue drops: significant period-over-period declines
 * - Unmatched lines: statement lines with no catalog match
 * - DSP vs PRO gaps: streams reported by DSPs but missing from PRO statements
 */

import { db } from "@/lib/infra/db";
import { round, roundMoney } from "@/lib/finance/math-utils";

// ---------- Types ----------

export interface Discrepancy {
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    confidence: number;
    estimatedImpact: number;
    resourceType: string;
    resourceId: string;
    description: string;
}

/**
 * Typical per-use rates by society (USD)
 */
const TYPICAL_RATES: Record<string, { min: number; avg: number }> = {
    ASCAP: { min: 0.01, avg: 0.08 },
    BMI: { min: 0.01, avg: 0.07 },
    MLC: { min: 0.003, avg: 0.004 },
    SOUNDEXCHANGE: { min: 0.001, avg: 0.0025 },
};

/**
 * Minimum stream count that warrants a DSP vs PRO discrepancy finding.
 * Below this threshold the royalty impact is negligible.
 */
const DSP_PRO_MIN_STREAMS = 1000;

/**
 * Fallback MLC per-stream rate (USD) used when TYPICAL_RATES lookup fails.
 * Represents the average mechanical rate paid by licensed streaming services.
 */
const DEFAULT_MLC_RATE = 0.004;

/** Stream volume that yields the maximum stream-volume confidence boost. */
const DSP_CONFIDENCE_MAX_STREAM_VOLUME = 100_000;

/** Maximum confidence boost from stream volume (fraction). */
const DSP_CONFIDENCE_MAX_STREAM_BOOST = 0.25;

/** Confidence boost earned per additional DSP source reporting the same ISRC. */
const DSP_CONFIDENCE_PER_EXTRA_SOURCE = 0.05;

/** Maximum confidence boost from multiple DSP sources reporting the same ISRC. */
const DSP_CONFIDENCE_MAX_SOURCE_BOOST = 0.15;

// ---------- Main Entry ----------

/**
 * Run all discrepancy checks for a given statement.
 * Creates Finding records for each detected issue.
 */
export async function runDiscrepancyChecks(
    statementId: string,
    orgId: string
): Promise<{ total: number; created: number }> {
    const discrepancies: Discrepancy[] = [];

    // Run all checks in parallel
    const [missing, rateIssues, drops, unmatched, dspPro] = await Promise.all([
        checkMissingWorks(statementId, orgId),
        checkRateAnomalies(statementId, orgId),
        checkRevenueDrops(orgId),
        checkUnmatchedLines(statementId, orgId),
        checkDspProDiscrepancies(statementId, orgId),
    ]);

    discrepancies.push(...missing, ...rateIssues, ...drops, ...unmatched, ...dspPro);

    // Deduplicate by resourceId + type
    const seen = new Set<string>();
    const unique = discrepancies.filter(d => {
        const key = `${d.type}:${d.resourceId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Check for existing findings to avoid duplicates
    const existingFindings = await db.finding.findMany({
        where: { orgId, type: { startsWith: "STATEMENT_" } },
        select: { type: true, resourceId: true },
    });
    const existingSet = new Set(existingFindings.map((f: { type: string; resourceId: string }) => `${f.type}:${f.resourceId}`));

    const newDiscrepancies = unique.filter((d: Discrepancy) => !existingSet.has(`${d.type}:${d.resourceId}`));

    // Create findings
    if (newDiscrepancies.length > 0) {
        await db.finding.createMany({
            data: newDiscrepancies.map(d => ({
                type: d.type,
                severity: d.severity,
                status: "OPEN",
                confidence: d.confidence,
                estimatedImpact: d.estimatedImpact,
                resourceType: d.resourceType,
                resourceId: d.resourceId,
                metadataFix: d.description,
                orgId,
            })),
        });
    }

    return { total: unique.length, created: newDiscrepancies.length };
}

// ---------- Check: Missing Works ----------

/**
 * Find catalog works that don't appear in the statement.
 */
async function checkMissingWorks(statementId: string, orgId: string): Promise<Discrepancy[]> {
    const statement = await db.statement.findUnique({
        where: { id: statementId },
        select: { source: true, period: true },
    });
    if (!statement) return [];

    // Get all works in catalog
    const catalogWorks = await db.work.findMany({
        where: { orgId },
        select: { id: true, title: true, registrations: { select: { society: true, status: true } } },
    });

    // Get works that appear in this statement
    const statementWorkIds = await db.statementLine.findMany({
        where: { statementId, workId: { not: null } },
        select: { workId: true },
        distinct: ["workId"],
    });
    const presentWorkIds = new Set(statementWorkIds.map((l: { workId: string | null }) => l.workId));

    const discrepancies: Discrepancy[] = [];

    for (const work of catalogWorks) {
        // Only flag if the work is registered with this society
        const isRegistered = work.registrations.some(
            (r: { society: string | null; status: string }) => r.society === statement.source && r.status !== "REJECTED"
        );

        if (isRegistered && !presentWorkIds.has(work.id)) {
            discrepancies.push({
                type: "STATEMENT_MISSING_WORK",
                severity: "HIGH",
                confidence: work.registrations.some((r: { status: string }) => r.status === "CONFIRMED") ? 95 : 75,
                estimatedImpact: 0, // Unknown — no data to estimate
                resourceType: "Work",
                resourceId: work.id,
                description: `"${work.title}" is registered with ${statement.source} but missing from ${statement.period} statement. May indicate uncollected royalties.`,
            });
        }
    }

    return discrepancies;
}

// ---------- Check: Rate Anomalies ----------

/**
 * Flag statement lines where per-use rate is significantly below society average.
 */
async function checkRateAnomalies(statementId: string, orgId: string): Promise<Discrepancy[]> {
    const lines = await db.statementLine.findMany({
        where: { statementId, uses: { gt: 0 }, amount: { gt: 0 } },
        select: {
            id: true,
            title: true,
            uses: true,
            amount: true,
            rate: true,
            society: true,
            workId: true,
        },
    });

    const discrepancies: Discrepancy[] = [];

    for (const line of lines) {
        const society = line.society || "ASCAP";
        const typical = TYPICAL_RATES[society];
        if (!typical) continue;

        const rate = line.rate || (line.uses > 0 ? round(line.amount / line.uses, 6) : 0);
        if (rate <= 0) continue;

        // Flag if rate is less than 30% of the average
        if (rate < typical.avg * 0.3) {
            const expectedAmount = round(line.uses * typical.avg, 4);
            const impact = roundMoney(expectedAmount - line.amount);

            // Confidence scales with deviation size and sample size (uses)
            const deviationRatio = 1 - (rate / typical.avg);
            const usesBoost = Math.min(line.uses / 1000, 0.15); // up to 15% boost for high-use works
            const confidence = Math.round(Math.min(95, 50 + deviationRatio * 30 + usesBoost * 100));

            discrepancies.push({
                type: "STATEMENT_RATE_ANOMALY",
                severity: impact > 100 ? "HIGH" : impact > 20 ? "MEDIUM" : "LOW",
                confidence,
                estimatedImpact: Math.max(0, impact),
                resourceType: "StatementLine",
                resourceId: line.workId || line.id,
                description: `"${line.title}" — rate $${rate.toFixed(4)}/use vs ${society} avg $${typical.avg.toFixed(4)}/use (${line.uses.toLocaleString()} uses). Potential underpayment of $${impact.toFixed(2)}.`,
            });
        }
    }

    return discrepancies;
}

// ---------- Check: Revenue Drops ----------

/**
 * Flag works with >25% period-over-period revenue decline.
 */
async function checkRevenueDrops(orgId: string): Promise<Discrepancy[]> {
    const periods = await db.royaltyPeriod.findMany({
        where: {
            orgId,
            workId: { not: null },
            changePercent: { lt: -25 },
            previousAmount: { gt: 10 }, // Only flag meaningful amounts
        },
        select: {
            workId: true,
            society: true,
            period: true,
            totalAmount: true,
            previousAmount: true,
            changePercent: true,
        },
    });

    return periods.map((p: typeof periods[0]) => {
        // Confidence scales with drop magnitude and previous revenue size
        const dropMagnitude = Math.abs(p.changePercent ?? 0) / 100; // 0-1
        const revenueWeight = Math.min((p.previousAmount ?? 0) / 500, 0.2); // up to 20% boost
        // Confidence scales with drop magnitude and historical revenue size
        const confidence = Math.round(Math.min(98, 55 + dropMagnitude * 35 + revenueWeight * 100));

        const impact = roundMoney((p.previousAmount || 0) - p.totalAmount);

        return {
            type: "STATEMENT_REVENUE_DROP",
            severity: (p.changePercent! < -50 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
            confidence,
            estimatedImpact: Math.max(0, impact),
            resourceType: "Work",
            resourceId: p.workId || "",
            description: `Revenue dropped ${Math.abs(p.changePercent!).toFixed(0)}% for ${p.society} in ${p.period} ($${p.previousAmount?.toFixed(2)} → $${p.totalAmount.toFixed(2)}).`,
        };
    });
}

// ---------- Check: Unmatched Lines ----------

/**
 * Flag statement lines that couldn't be matched to any catalog work.
 */
async function checkUnmatchedLines(statementId: string, orgId: string): Promise<Discrepancy[]> {
    const unmatchedLines = await db.statementLine.findMany({
        where: { statementId, workId: null, amount: { gt: 1 } },
        select: { id: true, title: true, amount: true, uses: true, society: true, isrc: true, iswc: true },
        orderBy: { amount: "desc" },
        take: 50, // Cap to avoid flooding
    });

    if (unmatchedLines.length === 0) return [];

    const totalUnmatchedAmount = roundMoney(unmatchedLines.reduce((acc: number, l: { amount: number }) => acc + l.amount, 0));

    // Create one summary finding + individual high-value ones
    const discrepancies: Discrepancy[] = [];

    // Summary finding
    discrepancies.push({
        type: "STATEMENT_UNMATCHED_LINES",
        severity: totalUnmatchedAmount > 100 ? "HIGH" : "MEDIUM",
        confidence: Math.min(85, 50 + (totalUnmatchedAmount > 100 ? 20 : 0) + (unmatchedLines.length > 5 ? 15 : 0)),
        estimatedImpact: totalUnmatchedAmount,
        resourceType: "Statement",
        resourceId: statementId,
        description: `${unmatchedLines.length} statement line(s) totaling $${totalUnmatchedAmount.toFixed(2)} couldn't be matched to catalog works. These may be works not yet in your catalog.`,
    });

    // Individual high-value unmatched lines
    for (const line of unmatchedLines) {
        if (line.amount <= 10) continue;

        // Higher confidence if we have strong identifiers but still no match
        const hasIdent = line.isrc || line.iswc ? 20 : 0;
        const impactBonus = Math.min(line.amount / 50, 15);
        const confidence = Math.round(Math.min(95, 50 + hasIdent + impactBonus));

        discrepancies.push({
            type: "STATEMENT_UNMATCHED_WORK",
            severity: line.amount > 50 ? "HIGH" : "MEDIUM",
            confidence,
            estimatedImpact: roundMoney(line.amount),
            resourceType: "StatementLine",
            resourceId: line.id,
            description: `"${line.title}" earned $${line.amount.toFixed(2)} (${line.uses} uses) from ${line.society || "unknown"} but isn't in your catalog.`,
        });
    }

    return discrepancies;
}

// ---------- Check: DSP vs PRO Discrepancies ----------

/**
 * Cross-reference DSP stream data against PRO statement lines for the same period.
 *
 * Identifies ISRCs that have significant streaming activity in DSP reports
 * but are absent from (or under-reported in) the corresponding PRO statement.
 * This surfaces potential mechanical royalty gaps where streaming platforms
 * reported plays to the DSP but the matching PRO/MLC payment is missing.
 */
async function checkDspProDiscrepancies(statementId: string, orgId: string): Promise<Discrepancy[]> {
    const statement = await db.statement.findUnique({
        where: { id: statementId },
        select: { period: true, source: true },
    });
    if (!statement) return [];

    // Fetch DSP reports for the same period and org
    const dspReports = await db.dspReport.findMany({
        where: { orgId, period: statement.period, streams: { gte: DSP_PRO_MIN_STREAMS } },
        select: { id: true, isrc: true, title: true, artist: true, streams: true, revenue: true, source: true },
    });

    if (dspReports.length === 0) return [];

    // Aggregate DSP streams per ISRC (multiple sources may report the same recording)
    const dspByIsrc = new Map<string, { title: string; artist: string | null; totalStreams: number; totalRevenue: number; sources: string[] }>();
    for (const report of dspReports) {
        const existing = dspByIsrc.get(report.isrc);
        if (existing) {
            existing.totalStreams += report.streams;
            existing.totalRevenue += Number(report.revenue);
            existing.sources.push(report.source);
        } else {
            dspByIsrc.set(report.isrc, {
                title: report.title,
                artist: report.artist ?? null,
                totalStreams: report.streams,
                totalRevenue: Number(report.revenue),
                sources: [report.source],
            });
        }
    }

    // Fetch ISRCs that appear in this statement (already matched to works or not)
    const statementIsrcs = await db.statementLine.findMany({
        where: { statementId, isrc: { not: null } },
        select: { isrc: true, amount: true, uses: true },
    });

    const proIsrcSet = new Set(
        statementIsrcs
            .map((l: { isrc: string | null }) => l.isrc)
            .filter((isrc): isrc is string => Boolean(isrc))
            .map((isrc: string) => isrc.toUpperCase())
    );

    const discrepancies: Discrepancy[] = [];

    for (const [isrc, dspData] of dspByIsrc) {
        const normalizedIsrc = isrc.toUpperCase();
        if (proIsrcSet.has(normalizedIsrc)) continue; // Already reported in PRO statement

        // Estimate uncollected mechanical royalties using the MLC per-stream rate
        const mlcRate = TYPICAL_RATES["MLC"]?.avg ?? DEFAULT_MLC_RATE;
        const estimatedImpact = roundMoney(dspData.totalStreams * mlcRate);

        // Confidence scales with stream volume and number of DSP sources
        const streamBoost = Math.min(
            dspData.totalStreams / DSP_CONFIDENCE_MAX_STREAM_VOLUME,
            DSP_CONFIDENCE_MAX_STREAM_BOOST
        );
        const sourceBoost = Math.min(
            (dspData.sources.length - 1) * DSP_CONFIDENCE_PER_EXTRA_SOURCE,
            DSP_CONFIDENCE_MAX_SOURCE_BOOST
        );
        const confidence = Math.round(Math.min(95, 55 + streamBoost * 100 + sourceBoost * 100));

        const severity: Discrepancy["severity"] =
            estimatedImpact > 100 ? "HIGH" : estimatedImpact > 20 ? "MEDIUM" : "LOW";

        const dspList = [...new Set(dspData.sources)].join(", ");

        discrepancies.push({
            type: "DSP_PRO_STREAM_GAP",
            severity,
            confidence,
            estimatedImpact,
            resourceType: "Recording",
            resourceId: normalizedIsrc,
            description: `ISRC ${normalizedIsrc} ("${dspData.title}") had ${dspData.totalStreams.toLocaleString()} streams on ${dspList} in ${statement.period} but was not reported in the ${statement.source} statement. Estimated uncollected mechanical: $${estimatedImpact.toFixed(2)}.`,
        });
    }

    return discrepancies;
}
