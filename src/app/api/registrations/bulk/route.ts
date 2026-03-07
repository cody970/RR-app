import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";
import { registerWorks } from "@/lib/infra/registration-service";
import type { RegistrationMethod } from "@/lib/infra/registration-service";
import { z } from "zod";

const bulkRegisterSchema = z.object({
    /** Finding IDs — we extract the work IDs from findings */
    findingIds: z.array(z.string().min(1)).min(1).max(100).optional(),
    /** Or directly specify work IDs */
    workIds: z.array(z.string().min(1)).min(1).max(100).optional(),
    /** Societies to register with */
    societies: z.array(z.string()).default(["ASCAP", "BMI"]),
    /** Registration method */
    method: z.enum(["TUNEREGISTRY", "CWR", "MANUAL"]).default("TUNEREGISTRY"),
    /** Publisher info */
    publisherName: z.string().optional(),
    publisherIpi: z.string().optional(),
    coPublisherSplit: z.number().min(0).max(100).default(5),
});

/**
 * POST /api/registrations/bulk
 *
 * Bulk-register works with PROs. Accepts either finding IDs (extracts work IDs)
 * or direct work IDs.
 */
export async function POST(req: Request) {
    try {
        const { orgId, role } = await requireAuth();

        // RBAC: require EDITOR or higher for bulk registration
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return ApiErrors.Forbidden(message);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = bulkRegisterSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
        }

        const { findingIds, workIds: directWorkIds, societies, method, publisherName, publisherIpi, coPublisherSplit } = parsed.data;

        if (!findingIds?.length && !directWorkIds?.length) {
            return ApiErrors.BadRequest("Must provide findingIds or workIds");
        }

        // Collect all work IDs
        const allWorkIds = new Set<string>();

        // From direct work IDs
        if (directWorkIds?.length) {
            for (const id of directWorkIds) allWorkIds.add(id);
        }

        // From findings — extract work IDs
        if (findingIds?.length) {
            const findings = await db.finding.findMany({
                where: { id: { in: findingIds }, orgId, resourceType: "Work" },
                select: { id: true, resourceId: true },
            });

            for (const finding of findings) {
                if (finding.resourceId) allWorkIds.add(finding.resourceId);
            }

            // Also check for recordings that link to works
            const recordingFindings = await db.finding.findMany({
                where: { id: { in: findingIds }, orgId, resourceType: "Recording" },
                select: { id: true, resourceId: true },
            });

            if (recordingFindings.length > 0) {
                const recordings = await db.recording.findMany({
                    where: {
                        id: { in: recordingFindings.map(f => f.resourceId) },
                        orgId,
                        workId: { not: null },
                    },
                    select: { workId: true },
                });

                for (const rec of recordings) {
                    if (rec.workId) allWorkIds.add(rec.workId);
                }
            }
        }

        const workIdsArray = Array.from(allWorkIds);

        if (workIdsArray.length === 0) {
            return ApiErrors.BadRequest("No valid work IDs found for registration");
        }

        // Verify works exist and belong to org
        const validWorks = await db.work.findMany({
            where: { id: { in: workIdsArray }, orgId },
            select: { id: true, title: true },
        });

        if (validWorks.length === 0) {
            return ApiErrors.BadRequest("No valid works found in your catalog");
        }

        // Check for existing registrations to avoid duplicates
        const existingRegs = await db.registration.findMany({
            where: {
                workId: { in: validWorks.map(w => w.id) },
                society: { in: societies },
                status: { not: "REJECTED" },
            },
            select: { workId: true, society: true },
        });

        const existingSet = new Set(existingRegs.map(r => `${r.workId}:${r.society}`));

        // Filter to only works that need registration
        const worksToRegister = validWorks.filter(w =>
            societies.some(s => !existingSet.has(`${w.id}:${s}`))
        );

        if (worksToRegister.length === 0) {
            return NextResponse.json({
                success: true,
                message: "All selected works are already registered with the specified societies",
                registered: 0,
                alreadyRegistered: validWorks.length,
                skipped: 0,
            });
        }

        // Perform registration
        const result = await registerWorks({
            orgId,
            workIds: worksToRegister.map(w => w.id),
            societies,
            method: method as RegistrationMethod,
            publisherName,
            publisherIpi,
            coPublisherSplit,
        });

        // Update related findings to reflect registration
        if (findingIds?.length) {
            await db.finding.updateMany({
                where: {
                    id: { in: findingIds },
                    orgId,
                    status: "OPEN",
                },
                data: { status: "RECOVERED" },
            });
        }

        return NextResponse.json({
            success: true,
            ...result,
            totalRequested: validWorks.length,
            alreadyRegistered: validWorks.length - worksToRegister.length,
        });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "status" in error && (error as any).status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}