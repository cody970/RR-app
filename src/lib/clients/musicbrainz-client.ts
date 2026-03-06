/**
 * Enhanced MusicBrainz API Client
 *
 * Extends the basic enrichment.ts with dedicated functions for
 * catalog scanning: ISRC→Work lookups, ISWC verification, and
 * artist catalog enumeration.
 *
 * Rate limit: 1 request/second per MusicBrainz API policy.
 * User-Agent header required.
 */

const MB_API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "RoyaltyRadar/1.0.0 (catalog-scanner)";
const REQUEST_DELAY_MS = 1100;

let lastRequestTime = 0;

async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

async function mbFetch<T>(path: string): Promise<T | null> {
    try {
        await throttle();
        const res = await fetch(`${MB_API_BASE}${path}`, {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "application/json",
            },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch (e) {
        console.error("MusicBrainz API error:", e);
        return null;
    }
}

// ---------- Type Definitions ----------

export interface MBRecording {
    id: string;
    title: string;
    length?: number;
    isrcs?: string[];
    "artist-credit"?: { name: string; artist: { id: string; name: string } }[];
    releases?: { id: string; title: string; date?: string }[];
}

export interface MBWork {
    id: string;
    title: string;
    iswcs?: string[];
    type?: string;
    relations?: {
        type: string;
        "target-type": string;
        recording?: { id: string; title: string };
        artist?: { id: string; name: string };
    }[];
}

export interface MBArtist {
    id: string;
    name: string;
    "sort-name": string;
    country?: string;
}

export interface MBSearchResult<T> {
    count: number;
    offset: number;
    recordings?: T[];
    works?: T[];
    artists?: T[];
}

// ---------- Lookup Functions ----------

/**
 * Lookup a recording by ISRC.
 * Returns all recordings associated with the ISRC code.
 */
export async function lookupRecordingByISRC(
    isrc: string
): Promise<MBRecording[]> {
    const data = await mbFetch<{ recordings: MBRecording[] }>(
        `/isrc/${encodeURIComponent(isrc)}?fmt=json&inc=artist-credits+releases`
    );
    return data?.recordings ?? [];
}

/**
 * Lookup a work by ISWC.
 * Returns all works associated with the ISWC code.
 */
export async function lookupWorkByISWC(iswc: string): Promise<MBWork[]> {
    const data = await mbFetch<{ works: MBWork[] }>(
        `/iswc/${encodeURIComponent(iswc)}?fmt=json`
    );
    return data?.works ?? [];
}

/**
 * Get full details for a specific work, including recording relations.
 */
export async function getWorkDetails(workId: string): Promise<MBWork | null> {
    return mbFetch<MBWork>(
        `/work/${workId}?fmt=json&inc=recording-rels+artist-rels`
    );
}

/**
 * Search for a work by title and optional artist name.
 * Uses fuzzy matching.
 */
export async function searchWorkByTitle(
    title: string,
    artist?: string
): Promise<MBWork[]> {
    let query = `work:"${title}"`;
    if (artist) query += ` AND artist:"${artist}"`;

    const data = await mbFetch<MBSearchResult<MBWork>>(
        `/work?query=${encodeURIComponent(query)}&fmt=json&limit=5`
    );
    return data?.works ?? [];
}

/**
 * Search for recordings by title and optional artist.
 */
export async function searchRecordingByTitle(
    title: string,
    artist?: string
): Promise<MBRecording[]> {
    let query = `recording:"${title}"`;
    if (artist) query += ` AND artist:"${artist}"`;

    const data = await mbFetch<MBSearchResult<MBRecording>>(
        `/recording?query=${encodeURIComponent(query)}&fmt=json&limit=5`
    );
    return data?.recordings ?? [];
}

/**
 * Search for an artist by name. Returns top matches.
 */
export async function searchArtist(name: string): Promise<MBArtist[]> {
    const data = await mbFetch<MBSearchResult<MBArtist>>(
        `/artist?query=artist:"${encodeURIComponent(name)}"&fmt=json&limit=5`
    );
    return data?.artists ?? [];
}

/**
 * Get all works associated with an artist (by MusicBrainz artist ID).
 * Paginates through results automatically.
 */
export async function getArtistWorks(
    artistMBID: string,
    limit = 100
): Promise<MBWork[]> {
    const allWorks: MBWork[] = [];
    let offset = 0;

    while (true) {
        const data = await mbFetch<{ works: MBWork[]; "work-count": number }>(
            `/artist/${artistMBID}?fmt=json&inc=works&limit=${limit}&offset=${offset}`
        );

        if (!data?.works?.length) break;

        allWorks.push(...data.works);
        offset += data.works.length;

        if (offset >= (data["work-count"] || 0)) break;
        // Safety: cap at 1000 works to avoid runaway pagination
        if (allWorks.length >= 1000) break;
    }

    return allWorks;
}

/**
 * Get all recordings by an artist (by MusicBrainz artist ID).
 * Paginates through results.
 */
export async function getArtistRecordings(
    artistMBID: string,
    limit = 100
): Promise<MBRecording[]> {
    const allRecordings: MBRecording[] = [];
    let offset = 0;

    while (true) {
        const data = await mbFetch<{
            recordings: MBRecording[];
            "recording-count": number;
        }>(
            `/recording?query=arid:${artistMBID}&fmt=json&limit=${limit}&offset=${offset}`
        );

        if (!data?.recordings?.length) break;

        allRecordings.push(...data.recordings);
        offset += data.recordings.length;

        if (offset >= (data["recording-count"] || 0)) break;
        if (allRecordings.length >= 1000) break;
    }

    return allRecordings;
}

/**
 * Cross-reference: given an ISRC, find the associated work (composition)
 * by walking recording → work relationships.
 * Returns the ISWC if the work is linked.
 */
export async function isrcToISWC(
    isrc: string
): Promise<{ iswc: string | null; workTitle: string | null; workId: string | null }> {
    const recordings = await lookupRecordingByISRC(isrc);
    if (!recordings.length) return { iswc: null, workTitle: null, workId: null };

    // Get recording details with work relations
    const recording = recordings[0];
    const details = await mbFetch<MBRecording & { relations?: { type: string; work?: MBWork }[] }>(
        `/recording/${recording.id}?fmt=json&inc=work-rels`
    );

    if (details?.relations) {
        for (const rel of details.relations) {
            if (rel.type === "performance" && rel.work) {
                return {
                    iswc: rel.work.iswcs?.[0] || null,
                    workTitle: rel.work.title,
                    workId: rel.work.id,
                };
            }
        }
    }

    return { iswc: null, workTitle: null, workId: null };
}
