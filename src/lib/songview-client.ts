/**
 * Songview / ASCAP ACE Repertoire Lookup Client
 *
 * Queries the public ASCAP ACE Repertory and BMI Repertoire
 * to determine if a work is registered with either PRO.
 * Results are cached in Redis for 24 hours to respect rate limits.
 */

import { redis } from "./redis";

const ACE_SEARCH_URL = "https://www.ascap.com/api/wservice/MasterData/Search";
const BMI_SEARCH_URL = "https://repertoire.bmi.com/Search/Search";

const CACHE_TTL_SECONDS = 86400; // 24 hours
const REQUEST_DELAY_MS = 1100; // ~1 req/sec to be respectful

let lastRequestTime = 0;

export interface SongviewResult {
    found: boolean;
    title?: string;
    iswc?: string;
    writers?: string[];
    publishers?: string[];
    society?: "ASCAP" | "BMI" | "BOTH";
    registrationStatus?: string;
    shares?: number;
    rawData?: Record<string, unknown>;
}

/**
 * Throttle requests to respect rate limits.
 */
async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

/**
 * Check Redis cache for a previous lookup result.
 */
async function getCached(key: string): Promise<SongviewResult | null> {
    try {
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

/**
 * Cache a lookup result in Redis.
 */
async function setCache(key: string, value: SongviewResult): Promise<void> {
    try {
        await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
    } catch (e) {
        console.error("Songview cache write error:", e);
    }
}

/**
 * Search ASCAP ACE Repertory for a work by title and optional writer.
 * Falls back to scraping the public search endpoint.
 */
async function searchASCAP(
    title: string,
    writer?: string
): Promise<SongviewResult | null> {
    try {
        await throttle();

        const params = new URLSearchParams({
            searchType: "Title",
            searchValue: title,
        });
        if (writer) params.set("writerName", writer);

        const res = await fetch(`${ACE_SEARCH_URL}?${params.toString()}`, {
            headers: {
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) {
            // ASCAP API may not be publicly available; fall back to title match
            return null;
        }

        const data = await res.json();
        if (data?.result?.length > 0) {
            const match = data.result[0];
            return {
                found: true,
                title: match.workTitle || title,
                iswc: match.iswc || undefined,
                writers: match.writers?.map((w: { name: string }) => w.name) || [],
                publishers: match.publishers?.map((p: { name: string }) => p.name) || [],
                society: "ASCAP",
                registrationStatus: "REGISTERED",
                rawData: match,
            };
        }
        return null;
    } catch (e) {
        console.error("ASCAP lookup error:", e);
        return null;
    }
}

/**
 * Search BMI Repertoire for a work by title and optional writer.
 */
async function searchBMI(
    title: string,
    writer?: string
): Promise<SongviewResult | null> {
    try {
        await throttle();

        const params = new URLSearchParams({
            Main_Search_Text: title,
            Search_Type: "Song",
            View_Count: "10",
            Page_Number: "1",
        });
        if (writer) params.set("Writer_Name", writer);

        const res = await fetch(`${BMI_SEARCH_URL}?${params.toString()}`, {
            headers: {
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (data?.songs?.length > 0) {
            const match = data.songs[0];
            return {
                found: true,
                title: match.title || title,
                iswc: match.iswc || undefined,
                writers: match.writers?.map((w: { name: string }) => w.name) || [],
                publishers: match.publishers?.map((p: { name: string }) => p.name) || [],
                society: "BMI",
                registrationStatus: "REGISTERED",
                rawData: match,
            };
        }
        return null;
    } catch (e) {
        console.error("BMI lookup error:", e);
        return null;
    }
}

/**
 * Search both ASCAP and BMI for a work registration.
 * Returns combined results with society indicator.
 */
export async function searchByTitle(
    title: string,
    writer?: string
): Promise<SongviewResult> {
    const cacheKey = `songview:title:${title.toLowerCase()}:${(writer || "").toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const [ascapResult, bmiResult] = await Promise.all([
        searchASCAP(title, writer),
        searchBMI(title, writer),
    ]);

    let result: SongviewResult;

    if (ascapResult && bmiResult) {
        result = {
            ...ascapResult,
            society: "BOTH",
            publishers: [
                ...(ascapResult.publishers || []),
                ...(bmiResult.publishers || []),
            ],
        };
    } else if (ascapResult) {
        result = ascapResult;
    } else if (bmiResult) {
        result = bmiResult;
    } else {
        result = { found: false };
    }

    await setCache(cacheKey, result);
    return result;
}

/**
 * Search by ISWC code across both PROs.
 */
export async function searchByISWC(iswc: string): Promise<SongviewResult> {
    const cacheKey = `songview:iswc:${iswc}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    // ISWC lookup — try ASCAP first, then BMI
    const ascap = await searchASCAP(iswc);
    if (ascap?.found) {
        await setCache(cacheKey, ascap);
        return ascap;
    }

    const bmi = await searchBMI(iswc);
    if (bmi?.found) {
        await setCache(cacheKey, bmi);
        return bmi;
    }

    const result: SongviewResult = { found: false };
    await setCache(cacheKey, result);
    return result;
}

/**
 * Batch check multiple titles against PRO registrations.
 * Returns a map of title → SongviewResult.
 */
export async function batchCheckRegistrations(
    works: { title: string; writer?: string; iswc?: string }[]
): Promise<Map<string, SongviewResult>> {
    const results = new Map<string, SongviewResult>();

    for (const work of works) {
        // Try ISWC first if available (more precise)
        if (work.iswc) {
            const result = await searchByISWC(work.iswc);
            results.set(work.title, result);
        } else {
            const result = await searchByTitle(work.title, work.writer);
            results.set(work.title, result);
        }
    }

    return results;
}
