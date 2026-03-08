/**
 * Anomaly Detection Service
 *
 * Analyzes historical royalty period data to surface statements that are
 * significantly lower than a work's (or org's) historical average.
 *
 * Use cases:
 * - Flag individual works whose royalties dropped unexpectedly.
 * - Flag total-org revenue periods that are outliers vs. historical trend.
 */

import { db } from "@/lib/infra/db";
import { round, roundMoney } from "@/lib/finance/math-utils";

// ---------- Constants ----------

/** Maximum historical periods to include in the average calculation. */
const MAX_HISTORY_PERIODS = 12;

/** Minimum sample size before confidence boosting kicks in. */
const CONFIDENCE_MIN_SAMPLE = 3;

/** Additional sample periods needed to earn the full sample boost. */
const CONFIDENCE_SAMPLE_RANGE = 9; // 3..12 → 0..MAX_SAMPLE_BOOST

/** Maximum confidence boost from a large historical sample. */
const CONFIDENCE_MAX_SAMPLE_BOOST = 0.2;

/** Historical average divisor that yields the maximum amount-based confidence boost. */
const CONFIDENCE_AMOUNT_BOOST_DIVISOR = 500;

/** Maximum confidence boost from a high historical average amount. */
const CONFIDENCE_MAX_AMOUNT_BOOST = 0.15;

// ---------- Types ----------

export interface AnomalyResult {
    /** Identifies the subject: a workId, or "ORG_TOTAL" for org-level checks */
    resourceId: string;
    resourceType: "Work" | "OrgTotal";
    society: string;
    period: string;
    /** Amount recorded in the statement under review */
    actualAmount: number;
    /** Computed historical average (mean of prior periods) */
    historicalAverage: number;
    /** Percentage deviation: negative = below average */
    deviationPercent: number;
    /** Number of historical periods used to compute the average */
    sampleSize: number;
    /** Estimated shortfall vs. historical average */
    estimatedShortfall: number;
    severity: "HIGH" | "MEDIUM" | "LOW";
    /** 0-100 confidence score */
    confidence: number;
    description: string;
}

export interface AnomalyDetectionOptions {
    /**
     * Minimum number of historical periods required before flagging an anomaly.
     * Defaults to 3 — avoids false positives with too little history.
     */
    minSampleSize?: number;
    /**
     * Percentage below the historical average that triggers a flag.
     * Defaults to 25 (i.e., 25% below average).
     */
    thresholdPercent?: number;
    /**
     * Minimum absolute amount of the shortfall (USD) to create a finding.
     * Prevents noise from very low-value works.
     * Defaults to 5.
     */
    minShortfall?: number;
    /**
     * Maximum number of anomalies to return. Defaults to 100.
     */
    limit?: number;
}

// ---------- Public API ----------

/**
 * Detect anomalies in a specific royalty statement by comparing each
 * work/society combination against the same work's historical average.
 *
 * Returns anomaly results sorted by estimated shortfall descending.
 */
export async function detectStatementAnomalies(
    statementId: string,
    orgId: string,
    options: AnomalyDetectionOptions = {}
): Promise<AnomalyResult[]> {
    const {
        minSampleSize = 3,
        thresholdPercent = 25,
        minShortfall = 5,
        limit = 100,
    } = options;

    const statement = await db.statement.findUnique({
        where: { id: statementId },
        select: { period: true, source: true },
    });
    if (!statement) return [];

    // Fetch all RoyaltyPeriod rows for this period / org / society
    const currentPeriods = await db.royaltyPeriod.findMany({
        where: {
            orgId,
            period: statement.period,
            society: statement.source,
            workId: { not: null },
        },
        select: {
            workId: true,
            society: true,
            period: true,
            totalAmount: true,
        },
    });

    if (currentPeriods.length === 0) return [];

    const anomalies: AnomalyResult[] = [];

    for (const current of currentPeriods) {
        const avgResult = await calculateHistoricalAverage(
            orgId,
            current.workId!,
            current.society,
            current.period,
            minSampleSize
        );

        if (avgResult === null) continue; // Not enough history

        const actualAmount = round(Number(current.totalAmount), 4);
        const deviationPercent = avgResult.average > 0
            ? round(((actualAmount - avgResult.average) / avgResult.average) * 100, 2)
            : 0;

        if (deviationPercent >= -thresholdPercent) continue; // Within normal range

        const shortfall = roundMoney(avgResult.average - actualAmount);
        if (shortfall < minShortfall) continue;

        anomalies.push(
            buildAnomalyResult({
                resourceId: current.workId!,
                resourceType: "Work",
                society: current.society,
                period: current.period,
                actualAmount,
                historicalAverage: avgResult.average,
                deviationPercent,
                sampleSize: avgResult.sampleSize,
                estimatedShortfall: shortfall,
            })
        );
    }

    anomalies.sort((a, b) => b.estimatedShortfall - a.estimatedShortfall);

    return anomalies.slice(0, limit);
}

/**
 * Compute the historical average royalty amount for a specific
 * work + society combination, excluding the current period.
 *
 * Returns `null` when there are fewer periods than `minSampleSize`.
 */
export async function calculateHistoricalAverage(
    orgId: string,
    workId: string,
    society: string,
    excludePeriod: string,
    minSampleSize: number = 3
): Promise<{ average: number; sampleSize: number } | null> {
    const historicalPeriods = await db.royaltyPeriod.findMany({
        where: {
            orgId,
            workId,
            society,
            period: { not: excludePeriod },
        },
        select: { totalAmount: true },
        orderBy: { period: "desc" },
        take: MAX_HISTORY_PERIODS,
    });

    if (historicalPeriods.length < minSampleSize) return null;

    const total = historicalPeriods.reduce(
        (acc: number, p: { totalAmount: unknown }) => acc + Number(p.totalAmount),
        0
    );

    return {
        average: round(total / historicalPeriods.length, 4),
        sampleSize: historicalPeriods.length,
    };
}

/**
 * Detect anomalies at the org level (across all works / all societies)
 * for a given period, without being tied to a specific statement.
 *
 * Useful for scheduled jobs that want to flag any period that looks unusual
 * even when no statement was just imported.
 */
export async function detectOrgLevelAnomalies(
    orgId: string,
    period: string,
    options: AnomalyDetectionOptions = {}
): Promise<AnomalyResult[]> {
    const {
        minSampleSize = 3,
        thresholdPercent = 25,
        minShortfall = 5,
        limit = 100,
    } = options;

    // Aggregate total royalties per society for this period
    const currentTotals = await db.royaltyPeriod.findMany({
        where: { orgId, period, workId: null },
        select: { society: true, totalAmount: true },
    });

    if (currentTotals.length === 0) return [];

    const anomalies: AnomalyResult[] = [];

    for (const current of currentTotals) {
        const historicalRows = await db.royaltyPeriod.findMany({
            where: {
                orgId,
                society: current.society,
                period: { not: period },
                workId: null,
            },
            select: { totalAmount: true },
            orderBy: { period: "desc" },
            take: MAX_HISTORY_PERIODS,
        });

        if (historicalRows.length < minSampleSize) continue;

        const histTotal = historicalRows.reduce(
            (acc: number, r: { totalAmount: unknown }) => acc + Number(r.totalAmount),
            0
        );
        const avg = round(histTotal / historicalRows.length, 4);
        const actualAmount = round(Number(current.totalAmount), 4);

        if (avg === 0) continue;

        const deviationPercent = round(((actualAmount - avg) / avg) * 100, 2);
        if (deviationPercent >= -thresholdPercent) continue;

        const shortfall = roundMoney(avg - actualAmount);
        if (shortfall < minShortfall) continue;

        anomalies.push(
            buildAnomalyResult({
                resourceId: "ORG_TOTAL",
                resourceType: "OrgTotal",
                society: current.society,
                period,
                actualAmount,
                historicalAverage: avg,
                deviationPercent,
                sampleSize: historicalRows.length,
                estimatedShortfall: shortfall,
            })
        );
    }

    anomalies.sort((a, b) => b.estimatedShortfall - a.estimatedShortfall);

    return anomalies.slice(0, limit);
}

// ---------- Helpers ----------

interface BuildAnomalyInput {
    resourceId: string;
    resourceType: "Work" | "OrgTotal";
    society: string;
    period: string;
    actualAmount: number;
    historicalAverage: number;
    deviationPercent: number;
    sampleSize: number;
    estimatedShortfall: number;
}

function buildAnomalyResult(input: BuildAnomalyInput): AnomalyResult {
    const dropMagnitude = Math.abs(input.deviationPercent) / 100;
    const sampleBoost = Math.min(
        (input.sampleSize - CONFIDENCE_MIN_SAMPLE) / CONFIDENCE_SAMPLE_RANGE,
        CONFIDENCE_MAX_SAMPLE_BOOST
    );
    const amountBoost = Math.min(
        input.historicalAverage / CONFIDENCE_AMOUNT_BOOST_DIVISOR,
        CONFIDENCE_MAX_AMOUNT_BOOST
    );
    const confidence = Math.round(
        Math.min(97, 50 + dropMagnitude * 30 + sampleBoost * 100 + amountBoost * 100)
    );

    const severity: AnomalyResult["severity"] =
        input.deviationPercent < -50 ? "HIGH" : input.deviationPercent < -25 ? "MEDIUM" : "LOW";

    const label =
        input.resourceType === "OrgTotal"
            ? `Total ${input.society} royalties`
            : `Work ${input.resourceId} (${input.society})`;

    const description =
        `${label} for ${input.period} is $${input.actualAmount.toFixed(2)}, ` +
        `${Math.abs(input.deviationPercent).toFixed(1)}% below the historical average ` +
        `of $${input.historicalAverage.toFixed(2)} (based on ${input.sampleSize} prior period(s)). ` +
        `Estimated shortfall: $${input.estimatedShortfall.toFixed(2)}.`;

    return {
        ...input,
        severity,
        confidence,
        description,
    };
}

