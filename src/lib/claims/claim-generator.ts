/**
 * Claim Generator
 *
 * Generates standard claim formats (structured objects and CSV exports)
 * for Performing Rights Organizations (PROs) and Mechanical Rights
 * societies such as ASCAP, BMI, The MLC, and SoundExchange.
 *
 * A "claim" is a structured representation of a royalty recovery request
 * derived from one or more discrepancy Findings. Callers may persist the
 * returned objects directly, export them as CSV, or render them in a UI.
 */

import { round, roundMoney } from "@/lib/finance/math-utils";

// ---------- Types ----------

/** Supported target PRO / society identifiers */
export type SocietyCode =
    | "ASCAP"
    | "BMI"
    | "MLC"
    | "SOUNDEXCHANGE"
    | "SESAC"
    | "PRS"
    | "GEMA"
    | "SACEM"
    | "JASRAC"
    | string; // allow other society codes

/** Type of royalty being claimed */
export type ClaimType =
    | "PERFORMANCE"      // PRO performance royalties
    | "MECHANICAL"       // Mechanical licensing (e.g., The MLC)
    | "DIGITAL_AUDIO"    // Digital audio (SoundExchange)
    | "SYNCHRONIZATION"  // Sync licensing
    | "OTHER";

/** Status lifecycle of a generated claim */
export type ClaimStatus =
    | "DRAFT"
    | "READY"
    | "SUBMITTED"
    | "ACKNOWLEDGED"
    | "PAID"
    | "REJECTED"
    | "WITHDRAWN";

/** Input representing a single discrepancy finding to build a claim from */
export interface FindingInput {
    findingId: string;
    /** Work title */
    title: string;
    isrc?: string;
    iswc?: string;
    artist?: string;
    society: string;
    period?: string;
    amountPaid: number;
    amountExpected: number;
    currency: string;
    useType?: string;
    /** Description of the underlying discrepancy */
    description?: string;
}

/** Writer / rights-holder share on the claim */
export interface ClaimWriter {
    writerId: string;
    name: string;
    ipi?: string;
    splitPercent: number;
    claimedAmount: number;
    currency: string;
}

/** A single, fully-formed royalty claim */
export interface RoyaltyClaim {
    /** Stable identifier for the claim (caller-generated or UUID) */
    claimId: string;
    orgId: string;
    orgName: string;
    targetSociety: SocietyCode;
    claimType: ClaimType;
    status: ClaimStatus;
    /** ISO 8601 date string when the claim was generated */
    generatedAt: string;
    /** Period the claim covers (e.g., "2023-Q4") */
    period?: string;
    title: string;
    isrc?: string;
    iswc?: string;
    artist?: string;
    /** Total shortfall amount being claimed */
    claimedAmount: number;
    currency: string;
    /** Amount already paid by the society */
    amountPaid: number;
    /** Expected / correct amount per contract or typical rate */
    amountExpected: number;
    writers: ClaimWriter[];
    /** Human-readable narrative for the claim submission */
    narrative: string;
    /** Reference to the source finding */
    findingId?: string;
}

/** Batch of claims generated from multiple findings */
export interface ClaimBatch {
    batchId: string;
    orgId: string;
    orgName: string;
    generatedAt: string;
    targetSociety: SocietyCode;
    claims: RoyaltyClaim[];
    totalClaimed: number;
    currency: string;
}

// ---------- Society-Specific Helpers ----------

/**
 * Derives the most likely ClaimType for a society code.
 */
function claimTypeForSociety(society: SocietyCode): ClaimType {
    switch (society) {
        case "ASCAP":
        case "BMI":
        case "SESAC":
        case "PRS":
        case "GEMA":
        case "SACEM":
        case "JASRAC":
            return "PERFORMANCE";
        case "MLC":
            return "MECHANICAL";
        case "SOUNDEXCHANGE":
            return "DIGITAL_AUDIO";
        default:
            return "OTHER";
    }
}

/**
 * Builds a plain-English narrative explaining why the claim was raised.
 */
function buildNarrative(finding: FindingInput, orgName: string): string {
    const shortage = roundMoney(finding.amountExpected - finding.amountPaid);
    const pct =
        finding.amountExpected > 0
            ? round((shortage / finding.amountExpected) * 100, 2)
            : 0;

    const periodStr = finding.period ? ` for period ${finding.period}` : "";
    const isrcStr = finding.isrc ? ` (ISRC: ${finding.isrc})` : "";
    const desc = finding.description
        ? `\n\nAdditional context: ${finding.description}`
        : "";

    return (
        `${orgName} is filing a royalty adjustment claim with ${finding.society} ` +
        `for the work "${finding.title}"${isrcStr}${periodStr}. ` +
        `Our records indicate a shortfall of ${finding.currency} ${shortage.toFixed(4)} ` +
        `(${pct}% below expected) on reported use type "${finding.useType ?? "UNKNOWN"}". ` +
        `Amount paid: ${finding.currency} ${finding.amountPaid.toFixed(4)}. ` +
        `Amount expected: ${finding.currency} ${finding.amountExpected.toFixed(4)}.` +
        desc
    );
}

// ---------- Claim Factory ----------

/**
 * Generates a single RoyaltyClaim from a FindingInput.
 *
 * The claimed amount is calculated as `max(0, amountExpected - amountPaid)`
 * and rounded to 4 decimal places for consistency with the project's
 * `@db.Decimal(18, 4)` monetary schema.
 *
 * @param finding   Discrepancy data for the work being claimed
 * @param orgId     Organisation ID of the claimant
 * @param orgName   Organisation display name
 * @param writers   Rights-holders to apportion the claim across (optional)
 * @param claimId   Stable claim identifier (defaults to a timestamp-based key)
 */
export function generateClaim(
    finding: FindingInput,
    orgId: string,
    orgName: string,
    writers: Omit<ClaimWriter, "claimedAmount" | "currency">[] = [],
    claimId?: string
): RoyaltyClaim {
    const claimedAmount = round(
        Math.max(0, finding.amountExpected - finding.amountPaid),
        4
    );

    // Distribute the claimed amount to writers proportionally
    let allocated = 0;
    const writerClaims: ClaimWriter[] = writers.map((w, i) => {
        let share: number;
        if (i === writers.length - 1) {
            share = round(claimedAmount - allocated, 4);
        } else {
            share = round(claimedAmount * (w.splitPercent / 100), 4);
            allocated = round(allocated + share, 4);
        }
        return {
            ...w,
            claimedAmount: share,
            currency: finding.currency,
        };
    });

    return {
        claimId: claimId ?? `claim-${finding.findingId}-${Date.now()}`,
        orgId,
        orgName,
        targetSociety: finding.society as SocietyCode,
        claimType: claimTypeForSociety(finding.society as SocietyCode),
        status: "DRAFT",
        generatedAt: new Date().toISOString(),
        period: finding.period,
        title: finding.title,
        isrc: finding.isrc,
        iswc: finding.iswc,
        artist: finding.artist,
        claimedAmount,
        currency: finding.currency,
        amountPaid: finding.amountPaid,
        amountExpected: finding.amountExpected,
        writers: writerClaims,
        narrative: buildNarrative(finding, orgName),
        findingId: finding.findingId,
    };
}

/**
 * Generates a ClaimBatch from multiple findings targeting the same society.
 *
 * All findings must share the same `society` and `currency` — mismatches
 * are excluded and reported in the returned `skipped` list.
 *
 * @param findings        Array of finding inputs to batch
 * @param targetSociety   Society to address the batch to
 * @param orgId           Organisation ID of the claimant
 * @param orgName         Organisation display name
 * @param batchId         Optional stable batch identifier
 * @param fallbackCurrency ISO 4217 currency code used only when no matching
 *                         findings are found (defaults to "USD"). Providing an
 *                         explicit value avoids silent currency assumptions when
 *                         all findings are skipped.
 */
export function generateClaimBatch(
    findings: FindingInput[],
    targetSociety: SocietyCode,
    orgId: string,
    orgName: string,
    batchId?: string,
    fallbackCurrency: string = "USD"
): { batch: ClaimBatch; skipped: Array<{ findingId: string; reason: string }> } {
    const skipped: Array<{ findingId: string; reason: string }> = [];
    const claims: RoyaltyClaim[] = [];

    // Determine the batch currency from the first matching finding.
    // The caller-supplied fallbackCurrency is used only when no matching
    // findings exist, making the intent explicit rather than silently
    // defaulting to USD.
    const primaryCurrency =
        findings.find(f => f.society === targetSociety)?.currency ?? fallbackCurrency;

    for (const finding of findings) {
        if (finding.society !== targetSociety) {
            skipped.push({
                findingId: finding.findingId,
                reason: `Society mismatch: expected ${targetSociety}, got ${finding.society}`,
            });
            continue;
        }
        if (finding.currency !== primaryCurrency) {
            skipped.push({
                findingId: finding.findingId,
                reason: `Currency mismatch: expected ${primaryCurrency}, got ${finding.currency}`,
            });
            continue;
        }

        claims.push(generateClaim(finding, orgId, orgName));
    }

    const totalClaimed = round(
        claims.reduce((acc, c) => acc + c.claimedAmount, 0),
        4
    );

    const batch: ClaimBatch = {
        batchId: batchId ?? `batch-${targetSociety}-${Date.now()}`,
        orgId,
        orgName,
        generatedAt: new Date().toISOString(),
        targetSociety,
        claims,
        totalClaimed,
        currency: primaryCurrency,
    };

    return { batch, skipped };
}

// ---------- CSV Export ----------

/**
 * Serialises a ClaimBatch to a CSV string suitable for submission to
 * a PRO's online portal or bulk import tool.
 *
 * Columns: ClaimId, Society, Title, ISRC, ISWC, Artist, Period,
 *          ClaimType, AmountPaid, AmountExpected, ClaimedAmount, Currency, Status
 */
export function claimBatchToCsv(batch: ClaimBatch): string {
    const header = [
        "ClaimId",
        "Society",
        "Title",
        "ISRC",
        "ISWC",
        "Artist",
        "Period",
        "ClaimType",
        "AmountPaid",
        "AmountExpected",
        "ClaimedAmount",
        "Currency",
        "Status",
    ].join(",");

    const rows = batch.claims.map(c => {
        const cells = [
            csvEscape(c.claimId),
            csvEscape(c.targetSociety),
            csvEscape(c.title),
            csvEscape(c.isrc ?? ""),
            csvEscape(c.iswc ?? ""),
            csvEscape(c.artist ?? ""),
            csvEscape(c.period ?? ""),
            csvEscape(c.claimType),
            c.amountPaid.toFixed(4),
            c.amountExpected.toFixed(4),
            c.claimedAmount.toFixed(4),
            csvEscape(c.currency),
            csvEscape(c.status),
        ];
        return cells.join(",");
    });

    return [header, ...rows].join("\n");
}

/**
 * Serialises a single RoyaltyClaim to a CSV row (with header).
 */
export function claimToCsv(claim: RoyaltyClaim): string {
    return claimBatchToCsv({
        batchId: "single",
        orgId: claim.orgId,
        orgName: claim.orgName,
        generatedAt: claim.generatedAt,
        targetSociety: claim.targetSociety,
        claims: [claim],
        totalClaimed: claim.claimedAmount,
        currency: claim.currency,
    });
}

// ---------- Internal helpers ----------

function csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
