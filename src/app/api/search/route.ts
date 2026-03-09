import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { musoEnrichSchema } from "@/lib/schemas";
import { ApiErrors, withErrorHandler } from "@/lib/api/error-handler";
import { db } from "@/lib/infra/db";
import { search as musoSearch } from "@/lib/clients/muso-client";
import { searchSpotify } from "@/lib/clients/spotify";

export const POST = withErrorHandler(async (req: Request) => {
    const { role, orgId } = await requireAuth();
    validatePermission(role, "CATALOG_EDIT");

    const body = await req.json();
    const parsed = musoEnrichSchema.safeParse(body);
    if (!parsed.success || body.action !== "search") {
        return ApiErrors.BadRequest("Invalid request", parsed.error?.flatten?.());
    }

    const { query, type, limit } = body;

    // Local DB search (works, recordings, findings)
    const [works, recordings, findings, musoResults, spotifyResults] = await Promise.all([
        db.work.findMany({
            where: {
                orgId,
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { iswc: { contains: query, mode: "insensitive" } },
                ],
            },
            select: { id: true, title: true, iswc: true },
            take: 5,
        }),
        db.recording.findMany({
            where: {
                orgId,
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { isrc: { contains: query, mode: "insensitive" } },
                ],
            },
            select: { id: true, title: true, isrc: true },
            take: 5,
        }),
        db.finding.findMany({
            where: {
                orgId,
                OR: [
                    { type: { contains: query, mode: "insensitive" } },
                    { resourceId: { contains: query, mode: "insensitive" } },
                ],
            },
            select: { id: true, type: true, resourceId: true, severity: true },
            take: 5,
        }),
        musoSearch(query, type, limit),
        searchSpotify(query, limit),
    ]);

    const localResults = [
        ...works.map((w) => ({
            id: w.id,
            title: w.title,
            type: "Work" as const,
            identifier: w.iswc || undefined,
            source: "local",
        })),
        ...recordings.map((r) => ({
            id: r.id,
            title: r.title,
            type: "Recording" as const,
            identifier: r.isrc || undefined,
            source: "local",
        })),
        ...findings.map((f) => ({
            id: f.id,
            title: `${f.type.replace(/_/g, " ")} (${f.severity})`,
            type: "Finding" as const,
            identifier: f.resourceId,
            source: "local",
        })),
    ];

    // Normalize and merge all results
    const normalized = [
        ...localResults,
        ...(musoResults?.map((item: any) => ({
            ...item,
            source: "muso",
        })) || []),
        ...(spotifyResults?.map((item: any) => ({
            ...item,
            source: "spotify",
        })) || []),
    ];

    return NextResponse.json({ results: normalized });
});
