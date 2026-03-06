import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { token, action, reason } = body; // action = "APPROVE" or "DISPUTE"

        if (!token || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const signoff = await prisma.splitSignoff.findUnique({
            where: { token },
            include: { work: true }
        });

        if (!signoff) {
            return NextResponse.json({ error: "Invalid link" }, { status: 404 });
        }

        if (signoff.status !== "PENDING") {
            return NextResponse.json({ error: "This request has already been resolved." }, { status: 400 });
        }

        if (signoff.expiresAt < new Date()) {
            return NextResponse.json({ error: "This link has expired." }, { status: 400 });
        }

        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || "unknown";

        const updated = await prisma.splitSignoff.update({
            where: { token },
            data: {
                status: action === "APPROVE" ? "APPROVED" : "DISPUTED",
                disputeReason: action === "DISPUTE" ? reason : null,
                signedAt: new Date(),
                ipAddress
            }
        });

        // If approved, in the future we might automatically add the WorkWriter to the DB here.
        if (action === "APPROVE") {
            console.log(`[Success] Split of ${signoff.proposedSplit}% on work ${signoff.work.title} officially approved by ${signoff.writerName}.`);
        } else {
            console.log(`[Dispute] ${signoff.writerName} disputed the split. Reason: ${reason}`);
        }

        return NextResponse.json({ success: true, signoff: updated });
    } catch (error: any) {
        console.error("Error resolving split request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to resolve split request" },
            { status: 500 }
        );
    }
}
