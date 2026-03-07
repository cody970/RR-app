import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { db } from "@/lib/infra/db";
import { z } from "zod";
import crypto from "crypto";
import { apiError } from "@/lib/infra/utils";
import { sendSplitProposalEmail, sendSplitProposalSms } from "@/lib/notifications";

const splitRequestSchema = z.object({
    workId: z.string().min(1),
    targetEmail: z.string().email(),
    writerName: z.string().min(1),
    proposedSplit: z.number().min(0).max(100),
    targetPhone: z.string().optional(), // Optional phone number for SMS notifications
});

export async function POST(req: Request) {
    try {
        const { orgId } = await requireAuth();

        const body = await req.json().catch(() => ({}));
        const parsed = splitRequestSchema.safeParse(body);

        if (!parsed.success) {
            return apiError("Missing or invalid required fields", 400, parsed.error.flatten());
        }

        const { workId, targetEmail, writerName, proposedSplit, targetPhone } = parsed.data;

        // Get organization and work details for notifications
        const [organization, work] = await Promise.all([
            db.organization.findUnique({ where: { id: orgId } }),
            db.work.findUnique({ where: { id: workId } }),
        ]);

        if (!organization || !work) {
            return apiError("Organization or work not found", 404);
        }

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

        // Build the portal URL
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const portalUrl = `${baseUrl}/portal/splits/${token}`;

        // Send email notification
        await sendSplitProposalEmail(
            targetEmail,
            writerName,
            organization.name,
            work.title,
            proposedSplit,
            portalUrl
        );

        // Send SMS notification if phone number provided
        if (targetPhone) {
            await sendSplitProposalSms(
                targetPhone,
                writerName,
                work.title,
                proposedSplit,
                portalUrl
            );
        }

        console.log(`[Notification] Sent split approval request to ${targetEmail} for ${proposedSplit}%: ${portalUrl}`);

        return NextResponse.json({ success: true, signoff, portalUrl });
    } catch (error: unknown) {
        if ((error as { status?: number })?.status === 401) {
            return apiError("Unauthorized", 401);
        }
        console.error("Error creating split request:", error);
        return apiError((error as Error)?.message || "Failed to create split request", 500);
    }
}
