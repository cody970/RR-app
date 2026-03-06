/**
 * The MLC (Mechanical Licensing Collective) Client
 *
 * Checks whether works are registered with The MLC for
 * mechanical royalty collection on interactive streams.
 *
 * The MLC provides:
 * - Public work search at themlc.com
 * - Bulk data programs for qualifying publishers
 * - Claiming portal for unclaimed royalties
 *
 * API access requires: MLC_API_KEY env var (bulk data program enrollment)
 */

const MLC_BASE_URL = process.env.MLC_API_URL || "https://portal.themlc.com/api/v1";
const MLC_PUBLIC_SEARCH = "https://www.themlc.com/search";

const REQUEST_DELAY_MS = 1500; // Respectful rate limiting
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

export interface MLCWork {
    id: string;
    title: string;
    iswc?: string;
    writers: string[];
    publishers: string[];
    status: "MATCHED" | "UNMATCHED" | "PENDING";
    claimStatus?: "CLAIMED" | "UNCLAIMED" | "PARTIAL";
    matchedRecordings?: number;
}

export interface MLCSearchResult {
    found: boolean;
    works: MLCWork[];
    totalResults: number;
    unclaimedAmount?: number;
}

// ---------- API Functions ----------

/**
 * Search The MLC for a work by title.
 * Uses the bulk data API if available, falls back to public search.
 */
export async function searchMLCByTitle(
    title: string,
    writer?: string
): Promise<MLCSearchResult> {
    const apiKey = process.env.MLC_API_KEY;

    if (apiKey) {
        return searchMLCBulkAPI(title, writer);
    }

    // Fallback: query public search (limited data)
    return searchMLCPublic(title);
}

/**
 * Search The MLC via the bulk data API (requires enrollment).
 */
async function searchMLCBulkAPI(
    title: string,
    writer?: string
): Promise<MLCSearchResult> {
    try {
        await throttle();

        const params = new URLSearchParams({ title });
        if (writer) params.set("writer", writer);

        const res = await fetch(`${MLC_BASE_URL}/works/search?${params}`, {
            headers: {
                Authorization: `Bearer ${process.env.MLC_API_KEY}`,
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) {
            console.error(`MLC API error: ${res.status}`);
            return { found: false, works: [], totalResults: 0 };
        }

        const data = await res.json();
        const works: MLCWork[] = (data.works || []).map(
            (w: Record<string, unknown>) => ({
                id: w.id as string,
                title: w.title as string,
                iswc: (w.iswc as string) || undefined,
                writers: (w.writers as string[]) || [],
                publishers: (w.publishers as string[]) || [],
                status: w.matchStatus as MLCWork["status"],
                claimStatus: w.claimStatus as MLCWork["claimStatus"],
                matchedRecordings: w.matchedRecordings as number,
            })
        );

        return {
            found: works.length > 0,
            works,
            totalResults: data.totalResults || works.length,
            unclaimedAmount: data.unclaimedAmount,
        };
    } catch (e) {
        console.error("MLC bulk API error:", e);
        return { found: false, works: [], totalResults: 0 };
    }
}

/**
 * Search The MLC via public search (limited, no API key needed).
 */
async function searchMLCPublic(title: string): Promise<MLCSearchResult> {
    try {
        await throttle();

        const res = await fetch(
            `${MLC_PUBLIC_SEARCH}?q=${encodeURIComponent(title)}&type=works`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
                },
            }
        );

        if (!res.ok) {
            return { found: false, works: [], totalResults: 0 };
        }

        const data = await res.json();
        return {
            found: (data.results?.length || 0) > 0,
            works: (data.results || []).map(
                (r: Record<string, unknown>) => ({
                    id: r.id as string || "",
                    title: r.title as string || "",
                    iswc: (r.iswc as string) || undefined,
                    writers: (r.writers as string[]) || [],
                    publishers: (r.publishers as string[]) || [],
                    status: "MATCHED" as const,
                })
            ),
            totalResults: data.total || 0,
        };
    } catch (e) {
        console.error("MLC public search error:", e);
        return { found: false, works: [], totalResults: 0 };
    }
}

/**
 * Search The MLC by ISRC to find matched/unmatched recordings.
 */
export async function searchMLCByISRC(isrc: string): Promise<MLCSearchResult> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) return { found: false, works: [], totalResults: 0 };

    try {
        await throttle();

        const res = await fetch(`${MLC_BASE_URL}/recordings/search?isrc=${isrc}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) return { found: false, works: [], totalResults: 0 };

        const data = await res.json();
        return {
            found: (data.recordings?.length || 0) > 0,
            works: [],
            totalResults: data.totalResults || 0,
            unclaimedAmount: data.unclaimedAmount,
        };
    } catch (e) {
        console.error("MLC ISRC search error:", e);
        return { found: false, works: [], totalResults: 0 };
    }
}

/**
 * Check for unclaimed royalties at The MLC.
 * Returns the total unclaimed amount and list of unmatched works.
 */
export async function checkUnclaimedRoyalties(
    publisherId?: string
): Promise<{ unclaimedAmount: number; unmatchedWorks: MLCWork[] }> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) return { unclaimedAmount: 0, unmatchedWorks: [] };

    try {
        await throttle();

        const params = new URLSearchParams({ status: "UNMATCHED" });
        if (publisherId) params.set("publisherId", publisherId);

        const res = await fetch(`${MLC_BASE_URL}/works?${params}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
                "User-Agent": "RoyaltyRadar/1.0.0 (catalog-scanner)",
            },
        });

        if (!res.ok) return { unclaimedAmount: 0, unmatchedWorks: [] };

        const data = await res.json();
        return {
            unclaimedAmount: data.totalUnclaimedAmount || 0,
            unmatchedWorks: data.works || [],
        };
    } catch (e) {
        console.error("MLC unclaimed check error:", e);
        return { unclaimedAmount: 0, unmatchedWorks: [] };
    }
}
