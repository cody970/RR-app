import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { requireAuth } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { z } from "zod";
import { ApiErrors } from "@/lib/api/error-response";

const resolveSchema = z.object({
    token: z.string().min(1),
    action: z.enum(["APPROVE", "DISPUTE"]),
    reason: z.string().optional(),
    signatureData: z.string().optional(),
    signatureHash: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { session } = await requireAuth();
        const userEmail = session.user?.email?.toLowerCase();

        const body = await req.json().catch(() => ({}));
        const parsed = resolveSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Missing or invalid required fields", parsed.error.flatten());
        }

        const { token, action, reason, signatureData, signatureHash } = parsed.data;

        // Rate limit by IP to prevent brute-force token guessing
        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("remote-addr")
            || "unknown";

        const rateCheck = await checkRateLimit({
            key: `split-resolve:${ipAddress}`,
            limit: 10,
            windowMs: 60_000,
        });

        if (!rateCheck.success) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }

        const signoff = await db.splitSignoff.findUnique({
            where: { token },
            include: { work: true }
        });

        if (!signoff) {
            return NextResponse.json({ error: "Invalid link" }, { status: 404 });
        }

        // Verify that the logged-in user's email matches the signoff target email
        if (userEmail !== signoff.targetEmail.toLowerCase()) {
            return NextResponse.json({ error: "You are not authorized to resolve this split request. Please log in with the correct account." }, { status: 403 });
        }

        if (signoff.status !== "PENDING") {
            return NextResponse.json({ error: "This request has already been resolved." }, { status: 400 });
        }

        if (signoff.expiresAt < new Date()) {
            return NextResponse.json({ error: "This link has expired." }, { status: 400 });
        }

        if (action === "DISPUTE" && !reason?.trim()) {
            return NextResponse.json({ error: "A reason is required when disputing a split." }, { status: 400 });
        }

        const updated = await db.splitSignoff.update({
            where: { token },
            data: {
                status: action === "APPROVE" ? "APPROVED" : "DISPUTED",
                disputeReason: action === "DISPUTE" ? reason : null,
                signedAt: new Date(),
                ipAddress,
                // Store digital signature data for legal compliance
                signatureData: action === "APPROVE" ? signatureData : null,
                signatureHash: action === "APPROVE" ? signatureHash : null,
            }
        });

        // Update negotiation status if linked
        if (signoff.negotiationId && action === "APPROVE") {
            await db.splitNegotiation.update({
                where: { id: signoff.negotiationId },
                data: { status: "SIGNED" },
            });
        }

        if (action === "APPROVE") {
            console.log(`[Success] Split of ${signoff.proposedSplit}% on work ${signoff.work.title} officially approved by ${signoff.writerName}.`);
            if (signatureHash) {
                console.log(`[Signature] Digital signature captured. Hash: ${signatureHash.substring(0, 16)}...`);
            }
        } else {
            console.log(`[Dispute] ${signoff.writerName} disputed the split. Reason: ${reason}`);
        }

        return NextResponse.json({ success: true, signoff: updated });
    } catch (error: unknown) {
        console.error("Error resolving split request:", error);
        const message = error instanceof Error ? error.message : "Failed to resolve split request";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
