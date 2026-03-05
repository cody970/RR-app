import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;
        const userId = (session.user as any).id;

        const { taskId, proposedFix } = await req.json();

        const task = await db.task.findUnique({ where: { id: taskId, orgId }, include: { finding: true } });
        if (!task) return new Response("Task not found", { status: 404 });

        // In a real app, this would use an automated headless browser or API integration to the PRO
        // MVP simulates a successful fix integration.

        // Hash the fix evidence
        const contentToHash = JSON.stringify({ taskId, proposedFix, timestamp: Date.now() });
        const evidenceHash = crypto.createHash("sha256").update(contentToHash).digest("hex");

        // Persist changes
        await db.$transaction(async (tx: any) => {
            // 1. Mark Task Resolved
            await tx.task.update({
                where: { id: taskId },
                data: { status: "RESOLVED" }
            });

            // 2. Insert Audit Evidence Log
            await tx.auditLog.create({
                data: {
                    action: "AGENT_FIX_APPLIED",
                    details: JSON.stringify({
                        findingType: task.finding.type,
                        resourceId: task.finding.resourceId,
                        appliedFix: proposedFix
                    }),
                    evidenceHash,
                    orgId,
                    userId
                }
            });

            // 3. Update the underlying resource slightly if it was a missing ISRC/ISWC or Split
            if (task.finding.type === "MISSING_ISWC" && task.finding.resourceType === "Work") {
                await tx.work.update({
                    where: { id: task.finding.resourceId },
                    data: { iswc: proposedFix.newValue }
                });
            } else if (task.finding.type === "MISSING_ISRC" && task.finding.resourceType === "Recording") {
                await tx.recording.update({
                    where: { id: task.finding.resourceId },
                    data: { isrc: proposedFix.newValue }
                });
            }
        });

        return NextResponse.json({ success: true, evidenceHash });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
