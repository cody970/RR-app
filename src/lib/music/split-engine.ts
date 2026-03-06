import { db } from "@/lib/infra/db";

/**
 * Pure calculation for royalty splits.
 */
export function calculateSplits(amount: number, writers: { writerId: string; splitPercent: number }[]) {
    return writers.map(w => {
        const share = w.splitPercent / 100;
        const writerAmount = amount * share;
        return {
            writerId: w.writerId,
            amount: Math.round(writerAmount * 10000) / 10000,
        };
    }).filter(s => s.amount > 0);
}

/**
 * Validates that total shares do not exceed 100% (with small margin for rounding).
 */
export function validateSplitOwnership(writers: { splitPercent: number }[]): boolean {
    const total = writers.reduce((acc, w) => acc + w.splitPercent, 0);
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
        status: "UNPAID" as const,
    }));

    // 4. Create ledgers
    if (ledgers.length > 0) {
        await db.payeeLedger.createMany({
            data: ledgers,
        });
    }

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

    if (ledgers.length > 0) {
        await db.payeeLedger.createMany({
            data: ledgers,
        });
    }

    return ledgers.length;
}
