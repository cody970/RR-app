import { searchByISRC, searchByTitle } from "./spotify";
import {
    searchWorks,
    searchRecordings,
    lookupByISRC,
    lookupByISWC,
} from "./musicbrainz";

export interface EnrichmentMatch {
    found: boolean;
    externalIswc?: string;
    externalIsrc?: string;
    globalSharePercent?: number;
    matchScore: number;
    provider: string;
    spotifyUri?: string;
    suggestions?: {
        field: string;
        value: string | number;
        reason: string;
    }[];
}

export async function enrichMetadata(title: string, currentId?: string | null): Promise<EnrichmentMatch> {
    // 1. Try Spotify for Recordings if we have potential ISRC or Title
    if (process.env.SPOTIFY_CLIENT_ID) {
        try {
            let spotifyTrack = null;
            if (currentId && !currentId.startsWith("T-")) {
                spotifyTrack = await searchByISRC(currentId);
            } else if (!currentId) {
                spotifyTrack = await searchByTitle(title);
            }

            if (spotifyTrack) {
                const suggestions = [];
                if (spotifyTrack.external_ids.isrc) {
                    suggestions.push({ field: "isrc", value: spotifyTrack.external_ids.isrc, reason: "Verified ISRC from Spotify" });
                }
                suggestions.push({ field: "title", value: spotifyTrack.name, reason: "Canonical title from Spotify" });

                return {
                    found: true,
                    externalIsrc: spotifyTrack.external_ids.isrc,
                    matchScore: 100,
                    provider: "Spotify",
                    spotifyUri: spotifyTrack.uri,
                    suggestions
                };
            }
        } catch (e) {
            console.error("Spotify enrichment error:", e);
        }
    }

    // 2. MusicBrainz enrichment via dedicated client
    try {
        // If we have an ISWC, look it up directly
        if (currentId?.startsWith("T-")) {
            const works = await lookupByISWC(currentId);
            if (works.length > 0) {
                const best = works[0];
                const suggestions = [];
                if (best.title && best.title.toLowerCase() !== title.toLowerCase()) {
                    suggestions.push({ field: "title", value: best.title, reason: "Canonical title from MusicBrainz" });
                }
                return {
                    found: true,
                    externalIswc: currentId,
                    globalSharePercent: 100,
                    matchScore: 100,
                    provider: "MusicBrainz",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                };
            }
        }

        // If we have an ISRC, look it up directly
        if (currentId && !currentId.startsWith("T-")) {
            const recordings = await lookupByISRC(currentId);
            if (recordings.length > 0) {
                const best = recordings[0];
                const suggestions = [];
                if (best.title && best.title.toLowerCase() !== title.toLowerCase()) {
                    suggestions.push({ field: "title", value: best.title, reason: "Canonical title from MusicBrainz" });
                }
                return {
                    found: true,
                    externalIsrc: currentId,
                    globalSharePercent: 100,
                    matchScore: 100,
                    provider: "MusicBrainz",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                };
            }
        }

        // Fallback: search by title
        const isWorkSearch = currentId?.startsWith("T-") || !currentId;
        if (isWorkSearch) {
            const result = await searchWorks(title, 1);
            if (result.items.length > 0) {
                const best = result.items[0];
                const matchScore = best.score || 85;
                const suggestions = [];
                const externalIswc = best.iswcs?.[0];

                if (externalIswc && externalIswc !== currentId) {
                    suggestions.push({ field: "iswc", value: externalIswc, reason: "ISWC retrieved from MusicBrainz" });
                }
                if (best.title && best.title.toLowerCase() !== title.toLowerCase()) {
                    suggestions.push({ field: "title", value: best.title, reason: "Canonical title from MusicBrainz" });
                }

                return {
                    found: true,
                    externalIswc: externalIswc || (currentId?.startsWith("T-") ? currentId : undefined),
                    globalSharePercent: 100,
                    matchScore,
                    provider: "MusicBrainz",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                };
            }
        } else {
            const result = await searchRecordings(title, 1);
            if (result.items.length > 0) {
                const best = result.items[0];
                const matchScore = best.score || 85;
                const suggestions = [];
                const externalIsrc = best.isrcs?.[0];

                if (externalIsrc && externalIsrc !== currentId) {
                    suggestions.push({ field: "isrc", value: externalIsrc, reason: "ISRC retrieved from MusicBrainz" });
                }
                if (best.title && best.title.toLowerCase() !== title.toLowerCase()) {
                    suggestions.push({ field: "title", value: best.title, reason: "Canonical title from MusicBrainz" });
                }

                return {
                    found: true,
                    externalIsrc: externalIsrc || currentId,
                    globalSharePercent: 100,
                    matchScore,
                    provider: "MusicBrainz",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                };
            }
        }
    } catch (e) {
        console.error("MusicBrainz enrichment error:", e);
    }

    // 3. Last fallback — nothing found
    return { found: false, matchScore: 0, provider: "None" };
}
