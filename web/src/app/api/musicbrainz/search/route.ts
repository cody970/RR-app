import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
    searchWorks,
    searchRecordings,
    lookupByISRC,
    lookupByISWC,
} from "@/lib/musicbrainz";

/**
 * GET /api/musicbrainz/search?q=...&type=work|recording|isrc|iswc&limit=5
 *
 * Searches MusicBrainz for works, recordings, ISRCs, or ISWCs.
 * Auth-gated and rate-limited per org.
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response("Unauthorized", { status: 401 });
        }

        const orgId = (session.user as any).orgId as string;

        // Rate limit: 10 requests per minute per org
        const rl = await checkRateLimit({
            key: `rl:mb:${orgId}`,
            limit: 10,
            windowMs: 60_000,
        });
        if (!rl.success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Try again shortly." },
                { status: 429 }
            );
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim();
        const type = searchParams.get("type") || "work";
        const limit = Math.min(Number(searchParams.get("limit") || 5), 25);

        if (!q || q.length < 2) {
            return NextResponse.json({ results: [], count: 0 });
        }

        switch (type) {
            case "work": {
                const data = await searchWorks(q, limit);
                return NextResponse.json({
                    results: data.items.map((w) => ({
                        id: w.id,
                        title: w.title,
                        iswcs: w.iswcs || [],
                        type: w.type,
                        score: w.score,
                        artists: w["artist-credit"]?.map((ac) => ac.artist.name) || [],
                    })),
                    count: data.count,
                });
            }

            case "recording": {
                const data = await searchRecordings(q, limit);
                return NextResponse.json({
                    results: data.items.map((r) => ({
                        id: r.id,
                        title: r.title,
                        isrcs: r.isrcs || [],
                        length: r.length,
                        score: r.score,
                        artists: r["artist-credit"]?.map((ac) => ac.artist.name) || [],
                        releases: r.releases?.map((rel) => ({
                            id: rel.id,
                            title: rel.title,
                            date: rel.date,
                        })) || [],
                    })),
                    count: data.count,
                });
            }

            case "isrc": {
                const recordings = await lookupByISRC(q);
                return NextResponse.json({
                    results: recordings.map((r) => ({
                        id: r.id,
                        title: r.title,
                        isrcs: r.isrcs || [],
                        artists: r["artist-credit"]?.map((ac) => ac.artist.name) || [],
                    })),
                    count: recordings.length,
                });
            }

            case "iswc": {
                const works = await lookupByISWC(q);
                return NextResponse.json({
                    results: works.map((w) => ({
                        id: w.id,
                        title: w.title,
                        iswcs: w.iswcs || [],
                    })),
                    count: works.length,
                });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown type "${type}". Use work, recording, isrc, or iswc.` },
                    { status: 400 }
                );
        }
    } catch (err: any) {
        console.error("MusicBrainz search error:", err);
        return new Response(err.message || "Internal Server Error", { status: 500 });
    }
}
