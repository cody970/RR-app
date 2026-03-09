/**
 * MusicBrainz Search API Route
 *
 * GET /api/musicbrainz/search?q=...&type=work|recording|isrc|iswc&limit=5
 *
 * Searches MusicBrainz for works, recordings, ISRCs, or ISWCs.
 * Auth-gated and rate-limited per org (10 requests per minute).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { asyncLogger } from "@/lib/infra/logger-async";
import {
    searchWorkByTitle,
    searchRecordingByTitle,
    lookupRecordingByISRC,
    lookupWorkByISWC,
} from "@/lib/clients/musicbrainz-client";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000; // 1 minute

export async function GET(request: NextRequest) {
    const correlationId = crypto.randomUUID();

    try {
        const { orgId } = await requireAuth();

        // Rate limit: 10 requests per minute per org
        const rl = await checkRateLimit({
            key: `rl:mb:${orgId}`,
            limit: RATE_LIMIT,
            windowMs: RATE_WINDOW_MS,
        });

        if (!rl.success) {
            asyncLogger.warn("MusicBrainz search rate limit exceeded", {
                correlationId,
                operation: "musicbrainz_search",
                metadata: { orgId, retryAfter: rl.retryAfter },
            });
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Try again shortly.",
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: rl.retryAfter,
                },
                { status: 429 }
            );
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q")?.trim() ?? "";
        const type = searchParams.get("type") ?? "work";
        const rawLimit = parseInt(searchParams.get("limit") ?? "5", 10);
        const limit = Math.min(Number.isNaN(rawLimit) ? 5 : rawLimit, 25);

        asyncLogger.info("MusicBrainz search", {
            correlationId,
            operation: "musicbrainz_search",
            metadata: { orgId, type, limit, queryLength: q.length },
        });

        if (q.length < 2) {
            return NextResponse.json({ results: [], count: 0 });
        }

        switch (type) {
            case "work": {
                const works = await searchWorkByTitle(q);
                return NextResponse.json({
                    results: works.slice(0, limit).map((w) => ({
                        id: w.id,
                        title: w.title,
                        iswcs: w.iswcs ?? [],
                        type: w.type,
                        relations: w.relations ?? [],
                    })),
                    count: works.length,
                });
            }

            case "recording": {
                const recordings = await searchRecordingByTitle(q);
                return NextResponse.json({
                    results: recordings.slice(0, limit).map((r) => ({
                        id: r.id,
                        title: r.title,
                        isrcs: r.isrcs ?? [],
                        length: r.length,
                        artists:
                            r["artist-credit"]?.map((ac) => ac.artist.name) ??
                            [],
                        releases:
                            r.releases?.map((rel) => ({
                                id: rel.id,
                                title: rel.title,
                                date: rel.date,
                            })) ?? [],
                    })),
                    count: recordings.length,
                });
            }

            case "isrc": {
                const recordings = await lookupRecordingByISRC(q);
                return NextResponse.json({
                    results: recordings.slice(0, limit).map((r) => ({
                        id: r.id,
                        title: r.title,
                        isrcs: r.isrcs ?? [],
                        artists:
                            r["artist-credit"]?.map((ac) => ac.artist.name) ??
                            [],
                    })),
                    count: recordings.length,
                });
            }

            case "iswc": {
                const works = await lookupWorkByISWC(q);
                return NextResponse.json({
                    results: works.slice(0, limit).map((w) => ({
                        id: w.id,
                        title: w.title,
                        iswcs: w.iswcs ?? [],
                    })),
                    count: works.length,
                });
            }

            default:
                return NextResponse.json(
                    {
                        error: `Unknown type "${type}". Use work, recording, isrc, or iswc.`,
                        code: "INVALID_TYPE",
                    },
                    { status: 400 }
                );
        }
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json(
                { error: err.message, code: "UNAUTHORIZED" },
                { status: err.status }
            );
        }

        asyncLogger.error(
            "MusicBrainz search failed",
            err instanceof Error ? err : new Error(String(err)),
            { correlationId, operation: "musicbrainz_search" }
        );

        return NextResponse.json(
            {
                error: "Internal server error",
                code: "INTERNAL_ERROR",
                correlationId,
            },
            { status: 500 }
        );
    }
}
