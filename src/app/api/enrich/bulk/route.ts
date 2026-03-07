import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";
import { enrichMetadata } from "@/lib/music/enrichment";
import { z } from "zod";

const bulkEnrichSchema = z.object({
    /** Finding IDs to enrich — we extract resourceId + resourceType from each */
    findingIds: z.array(z.string().min(1)).min(1).max(100).optional(),
    /** Or directly specify work/recording IDs */
    workIds: z.array(z.string().min(1)).min(1).max(100).optional(),
});

/**
 * POST /api/enrich/bulk
 *
 * Bulk-enrich metadata for multiple findings or works.
 * For each item, calls the enrichment engine and auto-applies fixes.
 */
export async function POST(req: Request) {
    try {
        const { orgId, role } = await requireAuth();

        // RBAC: require EDITOR or higher for bulk enrichment
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return ApiErrors.Forbidden(message);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = bulkEnrichSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
        }

        const { findingIds, workIds } = parsed.data;

        if (!findingIds?.length && !workIds?.length) {
            return ApiErrors.BadRequest("Must provide findingIds or workIds");
        }

        const results: {
            id: string;
            status: "enriched" | "no_match" | "error";
            provider?: string;
            suggestionsApplied?: number;
        }[] = [];

        // ---------- Enrich from findings ----------
        if (findingIds?.length) {
            const findings = await db.finding.findMany({
                where: { id: { in: findingIds }, orgId },
                select: { id: true, resourceType: true, resourceId: true, type: true },
            });

            for (const finding of findings) {
                try {
                    // Get the resource title for enrichment lookup
                    let title = "";
                    let currentId: string | null = null;

                    if (finding.resourceType === "Work") {
                        const work = await db.work.findUnique({
                            where: { id: finding.resourceId },
                            select: { title: true, iswc: true },
                        });
                        if (work) {
                            title = work.title;
                            currentId = work.iswc;
                        }
                    } else if (finding.resourceType === "Recording") {
                        const recording = await db.recording.findUnique({
                            where: { id: finding.resourceId },
                            select: { title: true, isrc: true },
                        });
                        if (recording) {
                            title = recording.title;
                            currentId = recording.isrc;
                        }
                    }

                    if (!title) {
                        results.push({ id: finding.id, status: "error" });
                        continue;
                    }

                    const match = await enrichMetadata(title, currentId);

                    if (match.found && match.suggestions?.length) {
                        let applied = 0;

                        for (const suggestion of match.suggestions) {
                            try {
                                if (finding.resourceType === "Work") {
                                    await db.work.update({
                                        where: { id: finding.resourceId, orgId },
                                        data: { [suggestion.field]: suggestion.value },
                                    });
                                } else if (finding.resourceType === "Recording") {
                                    await db.recording.update({
                                        where: { id: finding.resourceId, orgId },
                                        data: { [suggestion.field]: suggestion.value },
                                    });
                                }
                                applied++;
                            } catch {
                                // Field may not exist on model — skip
                            }
                        }

                        // Mark finding as resolved if we applied fixes
                        if (applied > 0) {
                            await db.finding.update({
                                where: { id: finding.id },
                                data: { status: "RECOVERED" },
                            });
                        }

                        results.push({
                            id: finding.id,
                            status: "enriched",
                            provider: match.provider,
                            suggestionsApplied: applied,
                        });
                    } else {
                        results.push({ id: finding.id, status: "no_match" });
                    }
                } catch (e) {
                    console.error(`Enrichment error for finding ${finding.id}:`, e);
                    results.push({ id: finding.id, status: "error" });
                }
            }
        }

        // ---------- Enrich from work IDs directly ----------
        if (workIds?.length) {
            const works = await db.work.findMany({
                where: { id: { in: workIds }, orgId },
                select: { id: true, title: true, iswc: true },
            });

            for (const work of works) {
                try {
                    const match = await enrichMetadata(work.title, work.iswc);

                    if (match.found && match.suggestions?.length) {
                        let applied = 0;

                        for (const suggestion of match.suggestions) {
                            try {
                                await db.work.update({
                                    where: { id: work.id, orgId },
                                    data: { [suggestion.field]: suggestion.value },
                                });
                                applied++;
                            } catch {
                                // Skip invalid fields
                            }
                        }

                        results.push({
                            id: work.id,
                            status: "enriched",
                            provider: match.provider,
                            suggestionsApplied: applied,
                        });
                    } else {
                        results.push({ id: work.id, status: "no_match" });
                    }
                } catch (e) {
                    console.error(`Enrichment error for work ${work.id}:`, e);
                    results.push({ id: work.id, status: "error" });
                }
            }
        }

        const enriched = results.filter(r => r.status === "enriched").length;
        const noMatch = results.filter(r => r.status === "no_match").length;
        const errors = results.filter(r => r.status === "error").length;

        return NextResponse.json({
            success: true,
            total: results.length,
            enriched,
            noMatch,
            errors,
            results,
        });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "status" in error && (error as any).status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}