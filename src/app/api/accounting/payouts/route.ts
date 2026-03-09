import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/infra/db";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth/get-session";
import { ApiErrors } from "@/lib/api/error-response";

export async function GET(_req: NextRequest) {
    try {
        const { orgId } = await requireAuth();

        const payouts = await db.payout.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            include: {
                writer: true,
                publisher: true,
            }
        });

        return NextResponse.json(payouts);
    } catch (err: unknown) {
        if (err && typeof err === "object" && "status" in err) return err as Response;
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST: Batch UNPAID ledgers into a new Payout
export async function POST(req: NextRequest) {
    try {
        const { orgId } = await requireAuth();

        const body = await req.json();
        const { payeeId, period } = body;

        if (!payeeId || !period) {
            return ApiErrors.BadRequest("Missing payeeId or period");
        }

        // We use a transaction to safely mark ledgers as PAID and create the Payout
        const tx = await db.$transaction(async (prisma: Prisma.TransactionClient) => {
            // 1. Find the writer or publisher in parallel.
            // Querying both concurrently is faster than the sequential short-circuit (writer → publisher)
            // because the publisher path benefits most and the cost of one extra findUnique is negligible.
            const [writer, publisher] = await Promise.all([
                prisma.writer.findUnique({ where: { id: payeeId, orgId } }),
                prisma.publisher.findUnique({ where: { id: payeeId, orgId } }),
            ]);

            if (!writer && !publisher) {
                throw new Error("Payee not found");
            }

            // 2. Find UNPAID ledgers
            const ledgers = await prisma.payeeLedger.findMany({
                where: {
                    orgId,
                    status: "UNPAID",
                    OR: [
                        { writerId: payeeId },
                        { publisherId: payeeId }
                    ]
                }
            });

            if (ledgers.length === 0) {
                throw new Error("No unpaid balance for this payee.");
            }

            // Calculate total using Decimal arithmetic to preserve monetary precision
            const totalAmount = ledgers.reduce(
                (acc: Prisma.Decimal, l) => acc.add(l.amount),
                new Prisma.Decimal(0)
            );

            // 3. Create Payout
            const payout = await prisma.payout.create({
                data: {
                    orgId,
                    writerId: writer ? writer.id : null,
                    publisherId: publisher ? publisher.id : null,
                    period,
                    totalAmount,
                    status: "ISSUED", // Automatically mark issued for demo
                    paidAt: new Date()
                }
            });

            // 4. Update ledgers to PAID and link payout
            const ledgerIds = ledgers.map(l => l.id);
            await prisma.payeeLedger.updateMany({
                where: { id: { in: ledgerIds } },
                data: {
                    status: "PAID",
                    payoutId: payout.id
                }
            });

            // 5. Optionally, we can return the detailed ledgers to generate the PDF client-side
            const detailedLedgers = await prisma.payeeLedger.findMany({
                where: { payoutId: payout.id },
                include: {
                    writer: true
                }
            });

            return { payout, ledgers: detailedLedgers };
        });

        // Normally, the server might generate the PDF and upload to S3, saving statementUrl
        // Since we are generating client-side using jsPDF, we just return the full details.

        return NextResponse.json(tx);
    } catch (err: unknown) {
        if (err && typeof err === "object" && "status" in err) return err as Response;
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
