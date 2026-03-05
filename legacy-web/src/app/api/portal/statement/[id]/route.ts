import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePayoutStatementPDF } from "@/lib/accounting-pdf";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const payoutId = params.id;

        // Fetch payout with relations
        const payout = await db.payout.findUnique({
            where: { id: payoutId },
            include: {
                organization: true,
                writer: true,
                publisher: true,
                ledgerEntries: {
                    include: {
                        statementLine: true,
                        license: { include: { work: true } }
                    }
                }
            }
        });

        if (!payout) {
            return new NextResponse("Payout not found", { status: 404 });
        }

        // Security check: Only allow the recipient or an admin to download
        const isRecipient =
            (session.user.writerId && payout.writerId === session.user.writerId) ||
            (session.user.publisherId && payout.publisherId === session.user.publisherId);

        const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";

        if (!isRecipient && !isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Prepare data for PDF
        const payee = payout.writer || payout.publisher;
        if (!payee) return new NextResponse("Internal Server Error", { status: 500 });

        const pdfData = {
            orgName: payout.organization.name,
            payeeName: payee.name,
            payeeType: (payout.writer ? "Writer" : "Publisher") as "Writer" | "Publisher",
            period: payout.period,
            totalAmount: payout.totalAmount,
            currency: payout.ledgerEntries[0]?.currency || "USD",
            dateIssued: new Date(payout.createdAt).toLocaleDateString(),
            ledgers: payout.ledgerEntries.map((l: any) => ({
                id: l.id,
                date: new Date(l.createdAt).toLocaleDateString(),
                source: l.statementLineId ? "Royalties Statement" : "Sync Placement",
                workTitle: l.license?.work?.title || "Royalties",
                type: l.type,
                amount: l.amount
            }))
        };

        const doc = generatePayoutStatementPDF(pdfData);
        const pdfOutput = doc.output("arraybuffer");

        return new NextResponse(pdfOutput, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Statement_${payee.name.replace(/\s+/g, '_')}_${payout.period}.pdf"`
            }
        });

    } catch (error) {
        console.error("[PORTAL_STATEMENT_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
