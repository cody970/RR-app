import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { search, getTrackByISRC, getAlbumByUPC, getProfileCredits, enrichRecordingCredits, bulkEnrichCredits, findWriterIPI } from "@/lib/clients/muso-client";

/**
 * POST /api/muso/enrich
 *
 * Enrich catalog data using Muso.ai's verified credit database.
 * Supports single ISRC lookup, bulk ISRC enrichment, and writer IPI lookup.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action, isrc, isrcs, upc, writerName, query, profileId } = body;

        switch (action) {
            case "enrich-isrc": {
                if (!isrc) {
                    return NextResponse.json({ error: "isrc required" }, { status: 400 });
                }
                const result = await enrichRecordingCredits(isrc);
                return NextResponse.json(result);
            }

            case "bulk-enrich": {
                if (!isrcs?.length) {
                    return NextResponse.json({ error: "isrcs array required" }, { status: 400 });
                }
                const creditsMap = await bulkEnrichCredits(isrcs);
                const results: Record<string, any> = {};
                creditsMap.forEach((credits, key) => {
                    results[key] = credits;
                });
                return NextResponse.json({ results });
            }

            case "track-lookup": {
                if (!isrc) {
                    return NextResponse.json({ error: "isrc required" }, { status: 400 });
                }
                const track = await getTrackByISRC(isrc);
                return NextResponse.json(track || { found: false });
            }

            case "album-lookup": {
                if (!upc) {
                    return NextResponse.json({ error: "upc required" }, { status: 400 });
                }
                const album = await getAlbumByUPC(upc);
                return NextResponse.json(album || { found: false });
            }

            case "find-writer-ipi": {
                if (!writerName) {
                    return NextResponse.json({ error: "writerName required" }, { status: 400 });
                }
                const ipiResult = await findWriterIPI(writerName);
                return NextResponse.json(ipiResult);
            }

            case "search": {
                if (!query) {
                    return NextResponse.json({ error: "query required" }, { status: 400 });
                }
                const results = await search(query, { type: body.type, limit: body.limit });
                return NextResponse.json({ results });
            }

            case "profile-credits": {
                if (!profileId) {
                    return NextResponse.json({ error: "profileId required" }, { status: 400 });
                }
                const credits = await getProfileCredits(profileId, {
                    limit: body.limit,
                    offset: body.offset,
                });
                return NextResponse.json(credits || { credits: [], total: 0 });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid action. Use: enrich-isrc, bulk-enrich, track-lookup, album-lookup, find-writer-ipi, search, profile-credits" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Muso enrichment error:", error);
        return NextResponse.json(
            { error: "Failed to process Muso enrichment" },
            { status: 500 }
        );
    }
}
