import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { hasPermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/infra/activity";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Admin/Owner can update recovery status
    if (!hasPermission(session.user.role, "TASK_MANAGE")) {
        return new Response("Forbidden", { status: 403 });
    }

    try {
        const { status, recoveredAmount } = await req.json();

        const finding = await db.finding.update({
            where: {
                id,
                orgId: session.user.orgId
            },
            data: {
                status,
                recoveredAmount: recoveredAmount ? parseFloat(recoveredAmount) : undefined,
            },
        });

        await logActivity({
            orgId: session.user.orgId,
            userId: session.user.id,
            action: status === "RECOVERED" ? "RECOVERY_LOGGED" : "STATUS_UPDATED",
            resourceId: finding.id,
            resourceType: "Finding",
            details: `${status} update for ${finding.type}${recoveredAmount ? ` ($${recoveredAmount} recovered)` : ""}`
        });

        return NextResponse.json(finding);
    } catch (error: unknown) {
        console.error("Recovery update failed:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
