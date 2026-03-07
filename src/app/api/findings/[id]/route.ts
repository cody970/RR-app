import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { ApiErrors } from "@/lib/api/error-response";

const findingUpdateSchema = z.object({
    status: z.enum(["NEW", "INVESTIGATING", "CONFIRMED", "RECOVERED", "DISMISSED"]).optional(),
    recoveredAmount: z.number().min(0).optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: findingId } = await params;
        const { orgId, role, userId } = await requireAuth();

        // RBAC Check
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return ApiErrors.Forbidden(message);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = findingUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
        }

        const { status, recoveredAmount } = parsed.data;

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
                userId,
            }
        });

        // Add activity
        await db.activity.create({
            data: {
                action: "FINDING_UPDATED",
                details: `Updated finding status to ${status}`,
                orgId,
                userId,
                resourceId: findingId,
                resourceType: "Finding"
            }
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        if (error && typeof error === "object" && "status" in error && (error as any).status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
