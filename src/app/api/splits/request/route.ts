import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = (session.user as any).orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization found" }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const { workId, targetEmail, writerName, proposedSplit } = body;

        if (!workId || !targetEmail || !writerName || proposedSplit == null) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        // Create SplitSignoff record
        const signoff = await prisma.splitSignoff.create({
            data: {
                workId,
                organizationId: orgId,
                targetEmail,
                writerName,
                proposedSplit,
                token,
                expiresAt,
            }
        });

        // In a real application, you would send an email here with a link like:
        // https://app.royaltyradar.com/portal/splits/${token}
        console.log(`[Email Mock] Sent split approval to ${targetEmail} for ${proposedSplit}%: /portal/splits/${token}`);

        return NextResponse.json({ success: true, signoff });
    } catch (error: any) {
        console.error("Error creating split request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create split request" },
            { status: 500 }
        );
    }
}
