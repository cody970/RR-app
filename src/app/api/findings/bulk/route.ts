import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { ApiErrors } from "@/lib/api/error-response";

const bulkSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
    action: z.enum(["updateStatus", "createTasks"]),
    status: z.string().optional(),
});

export async function PATCH(req: Request) {
    try {
        const { orgId, role } = await requireAuth();

        // RBAC: require CATALOG_EDIT for bulk mutations
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return ApiErrors.Forbidden(message);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = bulkSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
        }

        const { ids, action, status } = parsed.data;

        if (action === "updateStatus" && status) {
            await db.finding.updateMany({
                where: { id: { in: ids }, orgId },
                data: { status },
            });
            return NextResponse.json({ success: true, updated: ids.length });
        }

        if (action === "createTasks") {
            // Verify all IDs belong to the org first
            const existingFindings = await db.finding.findMany({
                where: { id: { in: ids }, orgId },
                select: { id: true },
            });

            const validIds = existingFindings.map((f: { id: string }) => f.id);
            if (validIds.length === 0) {
                return ApiErrors.BadRequest("No valid findings found for this organization");
            }

            const tasks = validIds.map((findingId: string) => ({
                findingId,
                orgId,
                status: "OPEN",
            }));
            await db.task.createMany({ data: tasks });
            return NextResponse.json({
                success: true,
                created: validIds.length,
                requested: ids.length
            });
        }

        return new Response("Invalid action", { status: 400 });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "status" in error && (error as any).status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
