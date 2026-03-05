import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Retrieve unpaid balances grouped by Writer / Publisher
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        // Fetch all UNPAID ledgers
        const ledgers = await db.payeeLedger.findMany({
            where: {
                orgId,
                status: "UNPAID",
            },
            include: {
                writer: true,
                publisher: true,
            }
        });

        // Group by payee
        const balances = new Map();

        for (const ledger of ledgers) {
            const payeeId = ledger.writerId || ledger.publisherId || "UNKNOWN";
            const payeeName = ledger.writer?.name || ledger.publisher?.name || "Unknown Payee";
            const payeeType = ledger.writerId ? "Writer" : "Publisher";

            if (!balances.has(payeeId)) {
                balances.set(payeeId, {
                    id: payeeId,
                    name: payeeName,
                    type: payeeType,
                    amount: 0,
                    currency: ledger.currency,
                    ledgerCount: 0,
                });
            }

            const current = balances.get(payeeId);
            current.amount += ledger.amount;
            current.ledgerCount += 1;
        }

        return NextResponse.json(Array.from(balances.values()));
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
