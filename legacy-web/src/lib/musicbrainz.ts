/**
 * MusicBrainz API Client
 *
 * Provides typed lookup and search functions against the MusicBrainz Web Service v2.
 * Includes in-process rate limiting (1 req/sec) and optional Redis caching (24h TTL).
 *
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

const MB_BASE = "https://musicbrainz.org/ws/2";
const MB_USER_AGENT = "RoyaltyRadar/1.0.0 ( cody@royaltyradar.com )";
const MB_RATE_MS = 1100; // slightly over 1 s to stay safe
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MBArtistCredit {
    name: string;
    artist: { id: string; name: string; disambiguation?: string };
}

export interface MBWork {
    id: string;
    title: string;
    iswcs?: string[];
    type?: string;
    language?: string;
    disambiguation?: string;
    relations?: MBRelation[];
    "artist-credit"?: MBArtistCredit[];
    score?: number;
}

export interface MBRecording {
    id: string;
    title: string;
    length?: number; // ms
    isrcs?: string[];
    disambiguation?: string;
    "artist-credit"?: MBArtistCredit[];
    releases?: MBReleaseBrief[];
    score?: number;
}

export interface MBReleaseBrief {
    id: string;
    title: string;
    date?: string;
    country?: string;
    status?: string;
}

export interface MBRelation {
    type: string;
    "target-type": string;
    artist?: { id: string; name: string };
    work?: { id: string; title: string };
    recording?: { id: string; title: string };
}

export interface MBSearchResult<T> {
    created: string;
    count: number;
    offset: number;
    items: T[];
}

// ---------------------------------------------------------------------------
// In-process rate limiter (1 request per second)
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MB_RATE_MS) {
        await new Promise((resolve) => setTimeout(resolve, MB_RATE_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

// ---------------------------------------------------------------------------
// Optional Redis cache (gracefully degrades if Redis is unavailable)
// ---------------------------------------------------------------------------

type CacheModule = { globalCache: { get<T>(key: string): Promise<T | null>; set<T>(key: string, value: T, ttlMs: number): Promise<void> } };
let _cache: CacheModule["globalCache"] | null | undefined = undefined; // undefined = not yet loaded

async function getCache() {
    if (_cache !== undefined) return _cache;
    try {
        const mod = await import("./cache") as CacheModule;
        _cache = mod.globalCache;
    } catch {
        _cache = null; // Redis not available, skip caching
    }
    return _cache;
}

async function cachedFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    const cache = await getCache();
    if (cache) {
        const hit = await cache.get<T>(cacheKey).catch(() => null);
        if (hit) return hit;
    }
    const result = await fetcher();
    if (cache) {
        cache.set(cacheKey, result, CACHE_TTL_MS).catch(() => { }); // fire-and-forget
    }
    return result;
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function mbFetch<T>(path: string): Promise<T> {
    await throttle();
    const url = `${MB_BASE}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": MB_USER_AGENT,
            Accept: "application/json",
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`MusicBrainz API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Search functions
// ---------------------------------------------------------------------------

/**
 * Search works by title. Useful for finding ISWCs and writer credits.
 */
export async function searchWorks(
    query: string,
    limit = 5
): Promise<MBSearchResult<MBWork>> {
    const cacheKey = `mb:search:work:${query}:${limit}`;
    return cachedFetch(cacheKey, async () => {
        const data = await mbFetch<{ works: MBWork[]; count: number; offset: number; created: string }>(
            `/work/?query=work:${encodeURIComponent(query)}&limit=${limit}`
        );
        return {
            created: data.created,
            count: data.count,
            offset: data.offset,
            items: data.works || [],
        };
    });
}

/**
 * Search recordings by title. Useful for finding ISRCs and artist info.
 */
export async function searchRecordings(
    query: string,
    limit = 5
): Promise<MBSearchResult<MBRecording>> {
    const cacheKey = `mb:search:recording:${query}:${limit}`;
    return cachedFetch(cacheKey, async () => {
        const data = await mbFetch<{ recordings: MBRecording[]; count: number; offset: number; created: string }>(
            `/recording/?query=recording:${encodeURIComponent(query)}&limit=${limit}`
        );
        return {
            created: data.created,
            count: data.count,
            offset: data.offset,
            items: data.recordings || [],
        };
    });
}

// ---------------------------------------------------------------------------
// Lookup functions (by MusicBrainz ID)
// ---------------------------------------------------------------------------

/**
 * Look up a specific work by its MusicBrainz ID.
 * Includes artist-rels and ISWCs.
 */
export async function lookupWork(mbid: string): Promise<MBWork> {
    const cacheKey = `mb:lookup:work:${mbid}`;
    return cachedFetch(cacheKey, () =>
        mbFetch<MBWork>(`/work/${encodeURIComponent(mbid)}?inc=artist-rels`)
    );
}

/**
 * Look up a specific recording by its MusicBrainz ID.
 * Includes artist credits, ISRCs, and releases.
 */
export async function lookupRecording(mbid: string): Promise<MBRecording> {
    const cacheKey = `mb:lookup:recording:${mbid}`;
    return cachedFetch(cacheKey, () =>
        mbFetch<MBRecording>(`/recording/${encodeURIComponent(mbid)}?inc=artist-credits+isrcs+releases`)
    );
}

// ---------------------------------------------------------------------------
// Lookup by standard identifiers
// ---------------------------------------------------------------------------

/**
 * Find recordings matching a given ISRC.
 */
export async function lookupByISRC(isrc: string): Promise<MBRecording[]> {
    const cacheKey = `mb:isrc:${isrc}`;
    return cachedFetch(cacheKey, async () => {
        const data = await mbFetch<{ recordings?: MBRecording[] }>(
            `/isrc/${encodeURIComponent(isrc)}?inc=artist-credits+releases`
        );
        return data.recordings || [];
    });
}

/**
 * Find works matching a given ISWC.
 */
export async function lookupByISWC(iswc: string): Promise<MBWork[]> {
    const cacheKey = `mb:iswc:${iswc}`;
    return cachedFetch(cacheKey, async () => {
        const data = await mbFetch<{ "work-list"?: { work: MBWork[] }; works?: MBWork[] }>(
            `/iswc/${encodeURIComponent(iswc)}`
        );
        // MB API returns different shapes depending on version
        return data.works || data["work-list"]?.work || [];
    });
}
