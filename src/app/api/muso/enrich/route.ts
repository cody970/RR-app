import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { musoEnrichSchema } from "@/lib/schemas";
import { ApiErrors, withErrorHandler } from "@/lib/api/error-handler";
import {
    search,
    getTrackByISRC,
    getAlbumByUPC,
    getProfileCredits,
    enrichRecordingCredits,
    bulkEnrichCredits,
    findWriterIPI,
} from "@/lib/clients/muso-client";

/**
 * POST /api/muso/enrich
 *
 * Enrich catalog data using Muso.ai's verified credit database.
 * Supports single ISRC lookup, bulk ISRC enrichment, and writer IPI lookup.
 */
export const POST = withErrorHandler(async (req: Request) => {
    const { role } = await requireAuth();
    validatePermission(role, "CATALOG_EDIT");

    const body = await req.json();
    const parsed = musoEnrichSchema.safeParse(body);
    if (!parsed.success) {
        return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
    }

    const data = parsed.data;

    switch (data.action) {
        case "enrich-isrc": {
            const result = await enrichRecordingCredits(data.isrc);
            return NextResponse.json(result);
        }

        case "bulk-enrich": {
            const creditsMap = await bulkEnrichCredits(data.isrcs);
            const results: Record<string, unknown> = {};
            creditsMap.forEach((credits, key) => {
                results[key] = credits;
            });
            return NextResponse.json({ results });
        }

        case "track-lookup": {
            const track = await getTrackByISRC(data.isrc);
            return NextResponse.json(track || { found: false });
        }

        case "album-lookup": {
            const album = await getAlbumByUPC(data.upc);
            return NextResponse.json(album || { found: false });
        }

        case "find-writer-ipi": {
            const ipiResult = await findWriterIPI(data.writerName);
            return NextResponse.json(ipiResult);
        }

        case "search": {
            const results = await search(data.query, { type: data.type, limit: data.limit });
            return NextResponse.json({ results });
        }

        case "profile-credits": {
            const credits = await getProfileCredits(data.profileId, { limit: data.limit, offset: data.offset });
            return NextResponse.json(credits || { credits: [], total: 0 });
        }

        default:
            return ApiErrors.BadRequest(
                "Invalid action. Use: enrich-isrc, bulk-enrich, track-lookup, album-lookup, find-writer-ipi, search, profile-credits"
            );
    }
});
