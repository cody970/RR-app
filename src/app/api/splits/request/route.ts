import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { db } from "@/lib/infra/db";
import { z } from "zod";
import crypto from "crypto";
import { apiError } from "@/lib/infra/utils";

const splitRequestSchema = z.object({
    workId: z.string().min(1),
    targetEmail: z.string().email(),
    writerName: z.string().min(1),
    proposedSplit: z.number().min(0).max(100),
});

export async function POST(req: Request) {
    try {
        const { orgId } = await requireAuth();

        const body = await req.json().catch(() => ({}));
        const parsed = splitRequestSchema.safeParse(body);

        if (!parsed.success) {
            return apiError("Missing or invalid required fields", 400, parsed.error.flatten());
        }

        const { workId, targetEmail, writerName, proposedSplit } = parsed.data;

        // Generate a secure token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        // Create SplitSignoff record
        const signoff = await db.splitSignoff.create({
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

        console.log(`[Email Mock] Sent split approval to ${targetEmail} for ${proposedSplit}%: /portal/splits/${token}`);

        return NextResponse.json({ success: true, signoff });
    } catch (error: any) {
        if (error?.status === 401) {
            return apiError("Unauthorized", 401);
        }
        console.error("Error creating split request:", error);
        return apiError(error?.message || "Failed to create split request", 500);
    }
}
