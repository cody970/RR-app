import { searchByISRC, searchByTitle } from "./spotify";

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
    // 1. Try Spotify for Recordigs if we have potential ISRC or Title
    if (process.env.SPOTIFY_CLIENT_ID) {
        try {
            let spotifyTrack = null;
            // If currentId doesn't look like ISWC (T-), assume it's ISRC or missing
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

    // 2. Real Enrichment via MusicBrainz API
    try {
        const queryType = currentId?.startsWith("T-") || (!currentId && title) ? 'work' : 'recording';
        const url = `https://musicbrainz.org/ws/2/${queryType}/?query=${queryType}:${encodeURIComponent(title)}&fmt=json`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'RoyaltyRadar/1.0.0 ( cody@royaltyradar.com )',
                'Accept': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            const items = data[`${queryType}s`];

            if (items && items.length > 0) {
                const bestMatch = items[0];
                const matchScore = bestMatch.score || 85;

                const suggestions = [];
                let externalIswc = currentId && currentId.startsWith("T-") ? currentId : undefined;
                let externalIsrc = currentId && !currentId.startsWith("T-") ? currentId : undefined;

                if (queryType === 'work') {
                    if (bestMatch.iswcs && bestMatch.iswcs.length > 0) {
                        externalIswc = bestMatch.iswcs[0];
                        if (externalIswc !== currentId) {
                            suggestions.push({ field: "iswc", value: externalIswc, reason: "ISWC retrieved from MusicBrainz" });
                        }
                    }
                } else if (queryType === 'recording') {
                    if (bestMatch.isrcs && bestMatch.isrcs.length > 0) {
                        externalIsrc = bestMatch.isrcs[0].id || bestMatch.isrcs[0];
                        if (externalIsrc !== currentId) {
                            suggestions.push({ field: "isrc", value: externalIsrc, reason: "ISRC retrieved from MusicBrainz" });
                        }
                    }
                }

                if (bestMatch.title && bestMatch.title.toLowerCase() !== title.toLowerCase()) {
                    suggestions.push({ field: "title", value: bestMatch.title, reason: "Canonical title from MusicBrainz" });
                }

                return {
                    found: true,
                    externalIswc,
                    externalIsrc,
                    globalSharePercent: 100,
                    matchScore,
                    provider: "MusicBrainz",
                    suggestions: suggestions.length > 0 ? suggestions : undefined
                };
            }
        }
    } catch (e) {
        console.error("MusicBrainz enrichment error:", e);
    }

    // 3. Last fallback nothing found
    return { found: false, matchScore: 0, provider: "None" };
}
