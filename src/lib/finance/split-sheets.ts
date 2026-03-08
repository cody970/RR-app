/**
 * Split Sheet Service
 *
 * Calculates royalty distributions for multiple collaborators based on
 * predefined percentage splits, applying Decimal-safe arithmetic to
 * prevent floating-point accumulation errors.
 *
 * This service is the financial layer that sits on top of a parsed
 * statement — it does not write to the database; callers are responsible
 * for persisting results (e.g., via PayeeLedger entries).
 */

import { round, sum, roundMoney } from "@/lib/finance/math-utils";
import type { ParsedStatementLine } from "@/lib/finance/statement-parser";

// ---------- Types ----------

export interface Collaborator {
    /** Unique identifier for the collaborator (writer, publisher, etc.) */
    id: string;
    name: string;
    /** Ownership percentage (0–100). All collaborators on a split sheet must sum to ≤ 100. */
    splitPercent: number;
    /** Collaborator role, e.g. "WRITER", "PUBLISHER", "CO_PUBLISHER" */
    role?: string;
}

export interface SplitAllocation {
    collaboratorId: string;
    collaboratorName: string;
    splitPercent: number;
    amount: number;
    currency: string;
}

export interface SplitSheetResult {
    /** The gross amount that was distributed */
    totalAmount: number;
    currency: string;
    /** Per-collaborator breakdowns */
    allocations: SplitAllocation[];
    /** Any penny/dust amount that could not be evenly distributed */
    dustAmount: number;
}

export interface StatementSplitSummary {
    /** ISO period string (e.g., "2024-Q1") */
    period: string;
    source: string;
    collaboratorId: string;
    collaboratorName: string;
    splitPercent: number;
    /** Sum of all allocated amounts across all statement lines for this collaborator */
    totalAllocated: number;
    currency: string;
    lineCount: number;
    allocations: Array<SplitAllocation & { lineTitle: string; lineIsrc?: string }>;
}

// ---------- Validation ----------

/**
 * Validates that collaborator splits sum to exactly 100% (within a small
 * floating-point margin of ±0.01).
 *
 * Returns a descriptive error string if invalid, or `null` if valid.
 */
export function validateCollaboratorSplits(collaborators: Collaborator[]): string | null {
    if (collaborators.length === 0) {
        return "At least one collaborator is required.";
    }

    for (const c of collaborators) {
        if (c.splitPercent < 0 || c.splitPercent > 100) {
            return `Collaborator "${c.name}" has an invalid splitPercent (${c.splitPercent}). Must be between 0 and 100.`;
        }
    }

    const total = sum(collaborators.map(c => c.splitPercent));
    if (Math.abs(total - 100) > 0.01) {
        return `Collaborator splits total ${round(total, 4)}%, but must equal 100%.`;
    }

    return null;
}

// ---------- Core Calculation ----------

/**
 * Distributes a single monetary amount across collaborators according to
 * their split percentages.
 *
 * Uses the "last-party remainder" technique: each party except the last
 * receives `round(amount * splitPercent / 100, 4)`, and the final party
 * absorbs any rounding dust so the total is always preserved exactly.
 *
 * @param amount   Gross amount to distribute (number with up to 4 decimal places)
 * @param currency ISO 4217 currency code
 * @param collaborators  Collaborators with valid, 100%-summing splits
 */
export function distributeSplits(
    amount: number,
    currency: string,
    collaborators: Collaborator[]
): SplitSheetResult {
    if (collaborators.length === 0) {
        return { totalAmount: amount, currency, allocations: [], dustAmount: 0 };
    }

    let allocated = 0;
    const allocations: SplitAllocation[] = [];

    for (let i = 0; i < collaborators.length; i++) {
        const c = collaborators[i];
        let share: number;

        if (i === collaborators.length - 1) {
            // Last party absorbs any rounding remainder
            share = round(amount - allocated, 4);
        } else {
            share = round(amount * (c.splitPercent / 100), 4);
            allocated = round(allocated + share, 4);
        }

        allocations.push({
            collaboratorId: c.id,
            collaboratorName: c.name,
            splitPercent: c.splitPercent,
            amount: share,
            currency,
        });
    }

    const actualTotal = sum(allocations.map(a => a.amount));
    const dustAmount = round(amount - actualTotal, 4);

    return {
        totalAmount: amount,
        currency,
        allocations,
        dustAmount,
    };
}

// ---------- Statement-Level Distribution ----------

/**
 * Applies split percentages across every line of a parsed statement and
 * returns a per-collaborator summary.
 *
 * Lines with `amount === 0` are included for audit-trail completeness.
 *
 * @param lines         Parsed statement lines (from `parseStatement`)
 * @param period        Period identifier (e.g., "2024-Q1")
 * @param source        Society / source label (e.g., "ASCAP", "BMI")
 * @param collaborators Validated collaborators with 100%-summing splits
 */
export function applyStatementSplits(
    lines: ParsedStatementLine[],
    period: string,
    source: string,
    collaborators: Collaborator[]
): StatementSplitSummary[] {
    // Build a summary accumulator keyed by collaborator id
    type Acc = {
        totalAllocated: number;
        lineCount: number;
        currency: string;
        allocations: Array<SplitAllocation & { lineTitle: string; lineIsrc?: string }>;
    };

    // Derive the default currency from the first available line; fall back to "USD"
    // so accumulators are never initialised with a potentially wrong hard-coded value.
    const defaultCurrency = lines.length > 0 ? lines[0].currency : "USD";

    const accumulators = new Map<string, Acc>(
        collaborators.map(c => [
            c.id,
            { totalAllocated: 0, lineCount: 0, currency: defaultCurrency, allocations: [] },
        ])
    );

    for (const line of lines) {
        const result = distributeSplits(line.amount, line.currency, collaborators);
        for (const alloc of result.allocations) {
            const acc = accumulators.get(alloc.collaboratorId);
            if (!acc) continue;
            acc.totalAllocated = round(acc.totalAllocated + alloc.amount, 4);
            acc.lineCount += 1;
            acc.currency = alloc.currency;
            acc.allocations.push({
                ...alloc,
                lineTitle: line.title,
                lineIsrc: line.isrc,
            });
        }
    }

    return collaborators.map(c => {
        const acc = accumulators.get(c.id)!;
        return {
            period,
            source,
            collaboratorId: c.id,
            collaboratorName: c.name,
            splitPercent: c.splitPercent,
            totalAllocated: roundMoney(acc.totalAllocated),
            currency: acc.currency,
            lineCount: acc.lineCount,
            allocations: acc.allocations,
        };
    });
}

// ---------- Helpers ----------

/**
 * Returns the total undistributed "dust" across all lines in a statement
 * after applying the given collaborator splits.
 *
 * Useful for auditing whether rounding errors are within acceptable bounds.
 */
export function calculateTotalDust(
    lines: ParsedStatementLine[],
    collaborators: Collaborator[]
): number {
    let totalDust = 0;
    for (const line of lines) {
        const result = distributeSplits(line.amount, line.currency, collaborators);
        totalDust = round(totalDust + result.dustAmount, 4);
    }
    return totalDust;
}
