import { db } from "./db";

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
    const ledgers = [];

    // Simple math: splitPercent is 0-100.
    for (const workWriter of work.writers) {
        const share = workWriter.splitPercent / 100;
        const writerAmount = amountToDistribute * share;

        // Round to 4 decimal places to prevent floating point drift
        const roundedAmount = Math.round(writerAmount * 10000) / 10000;

        if (roundedAmount > 0) {
            ledgers.push({
                orgId,
                writerId: workWriter.writerId,
                statementLineId: line.id,
                amount: roundedAmount,
                currency: line.currency,
                type: "EARNING",
                status: "UNPAID",
            });
        }
    }

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
    const ledgers = [];

    for (const workWriter of license.work.writers) {
        const share = workWriter.splitPercent / 100;
        const writerAmount = amountToDistribute * share;
        const roundedAmount = Math.round(writerAmount * 10000) / 10000;

        if (roundedAmount > 0) {
            ledgers.push({
                orgId,
                writerId: workWriter.writerId,
                licenseId: license.id,
                amount: roundedAmount,
                currency: "USD",
                type: "EARNING",
                status: "UNPAID",
            });
        }
    }

    if (ledgers.length > 0) {
        await db.payeeLedger.createMany({
            data: ledgers,
        });
    }

    return ledgers.length;
}
