/**
 * SoundExchange Repertoire Client
 *
 * Checks whether sound recordings are registered with SoundExchange
 * for digital performance royalty collection (non-interactive streams:
 * internet radio, Pandora, SiriusXM, etc.).
 *
 * SoundExchange provides:
 * - ISRC Lookup Portal (public)
 * - Direct License / Repertoire Search
 * - API access for qualifying labels/distributors
 *
 * Requires: SOUNDEXCHANGE_API_KEY env var (for enhanced access)
 */

const SE_BASE_URL =
    process.env.SOUNDEXCHANGE_API_URL || "https://www.soundexchange.com/api/v1";
const SE_PUBLIC_SEARCH = "https://www.soundexchange.com/repertoire/search";

const REQUEST_DELAY_MS = 1500;
let lastRequestTime = 0;

async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

// ---------- Type Definitions ----------

export interface SERecording {
    id: string;
    title: string;
    isrc?: string;
    artist: string;
    label?: string;
    registrationStatus: "REGISTERED" | "UNREGISTERED" | "PENDING";
    featuredArtistRegistered?: boolean;
    soundRecordingCopyrightOwner?: string;
}

export interface SESearchResult {
    found: boolean;
    recordings: SERecording[];
    totalResults: number;
}

// ---------- API Functions ----------

/**
 * Search SoundExchange by ISRC to check registration status.
 */
export async function searchByISRC(isrc: string): Promise<SESearchResult> {
    const apiKey = process.env.SOUNDEXCHANGE_API_KEY;

    if (apiKey) {
        return searchSEAPI(isrc, "isrc");
    }

    return searchSEPublic(isrc);
}

/**
 * Search SoundExchange by recording title and artist.
 */
export async function searchByTitleArtist(
    title: string,
    artist: string
): Promise<SESearchResult> {
    const apiKey = process.env.SOUNDEXCHANGE_API_KEY;

    if (apiKey) {
        return searchSEAPI(`${title} ${artist}`, "title");
    }

    return searchSEPublic(`${title} ${artist}`);
}

/**
 * Search via SoundExchange API (requires API key).
 */
async function searchSEAPI(
    query: string,
    searchType: "isrc" | "title"
): Promise<SESearchResult> {
    try {
        await throttle();

        const params = new URLSearchParams({
            [searchType === "isrc" ? "isrc" : "q"]: query,
        });

        const res = await fetch(`${SE_BASE_URL}/recordings/search?${params}`, {
            headers: {
                Authorization: `Bearer ${process.env.SOUNDEXCHANGE_API_KEY}`,
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) {
            console.error(`SoundExchange API error: ${res.status}`);
            return { found: false, recordings: [], totalResults: 0 };
        }

        const data = await res.json();
        const recordings: SERecording[] = (data.recordings || []).map(
            (r: Record<string, unknown>) => ({
                id: r.id as string,
                title: r.title as string,
                isrc: (r.isrc as string) || undefined,
                artist: (r.featuredArtist as string) || (r.artist as string) || "",
                label: (r.label as string) || undefined,
                registrationStatus: r.registrationStatus as SERecording["registrationStatus"],
                featuredArtistRegistered: r.featuredArtistRegistered as boolean,
                soundRecordingCopyrightOwner: (r.copyrightOwner as string) || undefined,
            })
        );

        return {
            found: recordings.length > 0,
            recordings,
            totalResults: data.totalResults || recordings.length,
        };
    } catch (e) {
        console.error("SoundExchange API error:", e);
        return { found: false, recordings: [], totalResults: 0 };
    }
}

/**
 * Search via SoundExchange public search (limited, no API key).
 */
async function searchSEPublic(query: string): Promise<SESearchResult> {
    try {
        await throttle();

        const res = await fetch(
            `${SE_PUBLIC_SEARCH}?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
                },
            }
        );

        if (!res.ok) {
            return { found: false, recordings: [], totalResults: 0 };
        }

        const data = await res.json();
        const recordings: SERecording[] = (data.results || []).map(
            (r: Record<string, unknown>) => ({
                id: (r.id as string) || "",
                title: (r.title as string) || "",
                isrc: (r.isrc as string) || undefined,
                artist: (r.artist as string) || "",
                label: (r.label as string) || undefined,
                registrationStatus: "REGISTERED" as const,
            })
        );

        return {
            found: recordings.length > 0,
            recordings,
            totalResults: data.total || 0,
        };
    } catch (e) {
        console.error("SoundExchange public search error:", e);
        return { found: false, recordings: [], totalResults: 0 };
    }
}

/**
 * Batch check ISRCs against SoundExchange.
 * Returns a map of ISRC → registration status.
 */
export async function batchCheckISRCs(
    isrcs: string[]
): Promise<Map<string, SESearchResult>> {
    const results = new Map<string, SESearchResult>();

    for (const isrc of isrcs) {
        const result = await searchByISRC(isrc);
        results.set(isrc, result);
    }

    return results;
}
