/**
 * Discrepancy Engine
 *
 * Runs analysis on imported statement data to detect:
 * - Missing works: catalog works absent from statements
 * - Rate anomalies: per-use rates below society averages
 * - Revenue drops: significant period-over-period declines
 * - Unmatched lines: statement lines with no catalog match
 */

import { db } from "./db";

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

// Typical per-use rates by society (USD)
const TYPICAL_RATES: Record<string, { min: number; avg: number }> = {
    ASCAP: { min: 0.01, avg: 0.08 },
    BMI: { min: 0.01, avg: 0.07 },
    MLC: { min: 0.003, avg: 0.004 },
    SOUNDEXCHANGE: { min: 0.001, avg: 0.0025 },
};

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
    const [missing, rateIssues, drops, unmatched] = await Promise.all([
        checkMissingWorks(statementId, orgId),
        checkRateAnomalies(statementId, orgId),
        checkRevenueDrops(orgId),
        checkUnmatchedLines(statementId, orgId),
    ]);

    discrepancies.push(...missing, ...rateIssues, ...drops, ...unmatched);

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
    const existingSet = new Set(existingFindings.map(f => `${f.type}:${f.resourceId}`));

    const newDiscrepancies = unique.filter(d => !existingSet.has(`${d.type}:${d.resourceId}`));

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
    const presentWorkIds = new Set(statementWorkIds.map(l => l.workId));

    const discrepancies: Discrepancy[] = [];

    for (const work of catalogWorks) {
        // Only flag if the work is registered with this society
        const isRegistered = work.registrations.some(
            r => r.society === statement.source && r.status !== "REJECTED"
        );

        if (isRegistered && !presentWorkIds.has(work.id)) {
            discrepancies.push({
                type: "STATEMENT_MISSING_WORK",
                severity: "HIGH",
                confidence: 80,
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

        const rate = line.rate || (line.uses > 0 ? line.amount / line.uses : 0);
        if (rate <= 0) continue;

        // Flag if rate is less than 30% of the average
        if (rate < typical.avg * 0.3) {
            const expectedAmount = line.uses * typical.avg;
            const impact = expectedAmount - line.amount;

            discrepancies.push({
                type: "STATEMENT_RATE_ANOMALY",
                severity: impact > 100 ? "HIGH" : impact > 20 ? "MEDIUM" : "LOW",
                confidence: 65,
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

    return periods.map(p => ({
        type: "STATEMENT_REVENUE_DROP",
        severity: (p.changePercent! < -50 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
        confidence: 70,
        estimatedImpact: Math.max(0, (p.previousAmount || 0) - p.totalAmount),
        resourceType: "Work",
        resourceId: p.workId || "",
        description: `Revenue dropped ${Math.abs(p.changePercent!).toFixed(0)}% for ${p.society} in ${p.period} ($${p.previousAmount?.toFixed(2)} → $${p.totalAmount.toFixed(2)}).`,
    }));
}

// ---------- Check: Unmatched Lines ----------

/**
 * Flag statement lines that couldn't be matched to any catalog work.
 */
async function checkUnmatchedLines(statementId: string, orgId: string): Promise<Discrepancy[]> {
    const unmatchedLines = await db.statementLine.findMany({
        where: { statementId, workId: null, amount: { gt: 1 } },
        select: { id: true, title: true, amount: true, uses: true, society: true },
        orderBy: { amount: "desc" },
        take: 50, // Cap to avoid flooding
    });

    if (unmatchedLines.length === 0) return [];

    const totalUnmatchedAmount = unmatchedLines.reduce((sum, l) => sum + l.amount, 0);

    // Create one summary finding + individual high-value ones
    const discrepancies: Discrepancy[] = [];

    // Summary finding
    discrepancies.push({
        type: "STATEMENT_UNMATCHED_LINES",
        severity: totalUnmatchedAmount > 100 ? "HIGH" : "MEDIUM",
        confidence: 60,
        estimatedImpact: totalUnmatchedAmount,
        resourceType: "Statement",
        resourceId: statementId,
        description: `${unmatchedLines.length} statement line(s) totaling $${totalUnmatchedAmount.toFixed(2)} couldn't be matched to catalog works. These may be works not yet in your catalog.`,
    });

    // Individual high-value unmatched lines
    for (const line of unmatchedLines.filter(l => l.amount > 10)) {
        discrepancies.push({
            type: "STATEMENT_UNMATCHED_WORK",
            severity: line.amount > 50 ? "HIGH" : "MEDIUM",
            confidence: 55,
            estimatedImpact: line.amount,
            resourceType: "StatementLine",
            resourceId: line.id,
            description: `"${line.title}" earned $${line.amount.toFixed(2)} (${line.uses} uses) from ${line.society || "unknown"} but isn't in your catalog.`,
        });
    }

    return discrepancies;
}
