import { db } from "@/lib/infra/db";
import { round, sum } from "@/lib/finance/math-utils";

export interface WriterSplit {
    writerId: string;
    splitPercent: number;
}

/**
 * Pure calculation for royalty splits with dust handling.
 */
export function calculateSplits(amount: number, writers: WriterSplit[]) {
    if (writers.length === 0) return [];

    let totalAllocated = 0;
    const results = writers.map((w, index) => {
        // Handle last writer differently to avoid "dust" rounding errors
        if (index === writers.length - 1) {
            const finalAmount = round(amount - totalAllocated, 4);
            return {
                writerId: w.writerId,
                amount: finalAmount,
            };
        }

        const share = w.splitPercent / 100;
        const writerAmount = round(amount * share, 4);
        totalAllocated = round(totalAllocated + writerAmount, 4);

        return {
            writerId: w.writerId,
            amount: writerAmount,
        };
    });

    return results;
}

/**
 * Validates that total shares do not exceed 100% (with small margin for rounding).
 */
export function validateSplitOwnership(writers: { splitPercent: number }[]): boolean {
    const total = sum(writers.map(w => w.splitPercent));
    return total <= 100.001;
}

export async function processStatementLineSplits(lineId: string, orgId: string) {
    // 1. Fetch the line and its related work
    const line = await db.statementLine.findUnique({
        where: { id: lineId },
        include: {
            statement: true,
        }
    });

    if (!line || !line.workId) {
        throw new Error("Statement line not found or unmatched.");
    }

    // 2. Fetch the work and its writers
    const work = await db.work.findUnique({
        where: { id: line.workId },
        include: {
            writers: {
                include: { writer: true }
            }
        }
    });

    if (!work) {
        throw new Error("Work not found.");
    }

    // 3. Calculate splits
    const amountToDistribute = line.amount;
    const splitResults = calculateSplits(amountToDistribute, work.writers);

    const ledgers = splitResults.map(s => ({
        orgId,
        writerId: s.writerId,
        statementLineId: line.id,
        amount: s.amount,
        currency: line.currency,
        type: "EARNING" as const,
        status: s.amount === 0 ? "PAID" : "UNPAID" as const, // Treat zero-value splits as instantly cleared for audit
    }));

    // 4. Create ledgers
    await db.payeeLedger.createMany({
        data: ledgers,
    });

    return ledgers.length;
}

export async function processLicenseSplits(licenseId: string, orgId: string) {
    const license = await db.license.findUnique({
        where: { id: licenseId },
        include: {
            work: {
                include: {
                    writers: {
                        include: { writer: true }
                    }
                }
            }
        }
    });

    if (!license) throw new Error("License not found");

    const amountToDistribute = license.fee;
    const splitResults = calculateSplits(amountToDistribute, license.work.writers);

    const ledgers = splitResults.map(s => ({
        orgId,
        writerId: s.writerId,
        licenseId: license.id,
        amount: s.amount,
        currency: "USD" as const,
        type: "EARNING" as const,
        status: "UNPAID" as const,
    }));

    await db.payeeLedger.createMany({
        data: ledgers,
    });

    return ledgers.length;
}
