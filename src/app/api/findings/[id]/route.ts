import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: findingId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });

        const orgId = session.user.orgId;
        const role = session.user.role;

        // RBAC Check
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: any) {
            return new Response(e.message, { status: 403 });
        }

        const { status, recoveredAmount } = await req.json();

        const updated = await db.finding.update({
            where: { id: findingId, orgId },
            data: {
                status: status || undefined,
                recoveredAmount: recoveredAmount !== undefined ? recoveredAmount : undefined
            }
        });

        // Log the change
        await db.auditLog.create({
            data: {
                action: "FINDING_STATUS_UPDATED",
                details: JSON.stringify({ findingId, newStatus: status, recoveredAmount }),
                evidenceHash: `status-${findingId}-${Date.now()}`,
                orgId,
                userId: session.user.id
            }
        });

        // Add activity
        await db.activity.create({
            data: {
                action: "FINDING_UPDATED",
                details: `Updated finding status to ${status}`,
                orgId,
                userId: session.user.id,
                resourceId: findingId,
                resourceType: "Finding"
            }
        });

        return NextResponse.json(updated);
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
