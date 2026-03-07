import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { Prisma, PayeeLedger } from "@prisma/client";

export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

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
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST: Batch UNPAID ledgers into a new Payout
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const body = await req.json();
        const { payeeId, period } = body;

        if (!payeeId || !period) {
            return NextResponse.json({ error: "Missing payeeId or period" }, { status: 400 });
        }

        // We use a transaction to safely mark ledgers as PAID and create the Payout
        const tx = await db.$transaction(async (prisma: Prisma.TransactionClient) => {
            // 1. Find the writer or publisher
            const writer = await prisma.writer.findUnique({ where: { id: payeeId, orgId } });
            const publisher = !writer ? await prisma.publisher.findUnique({ where: { id: payeeId, orgId } }) : null;

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

            // Calculate total
            const totalAmount = ledgers.reduce((acc: number, l: PayeeLedger) => acc + l.amount, 0);

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
            const ledgerIds = ledgers.map((l: PayeeLedger) => l.id);
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
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
