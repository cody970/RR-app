/**
 * The MLC (Mechanical Licensing Collective) Client - Enhanced
 *
 * Comprehensive client for interacting with The MLC's APIs and data programs.
 * Based on MLC Matching Tool Research Report (January 2025).
 *
 * Capabilities:
 * - Public Search API: Work verification, ownership data lookup
 * - Bulk Data Access API: Enterprise-level catalog auditing (requires enrollment)
 * - ISRC-to-Work Matching: Connect sound recordings to compositions
 * - DURP Integration: Distributor Unmatched Recordings Portal access
 * - Unmatched Monitoring: Continuous monitoring for unclaimed royalties
 * - Bulk Matching: Batch processing of multiple recordings/works
 *
 * API access tiers:
 *   - Public Search: No key required (limited data)
 *   - Bulk Data API: Requires MLC_API_KEY (bulk data program enrollment)
 *   - DURP Access: Requires MLC_DURP_KEY (distributor portal enrollment)
 *
 * @see docs/research/MLC_Matching_Tool_Research_Report.md
 */

import { withRetry, CircuitBreaker } from "@/lib/infra/retry";
import { asyncLogger } from "@/lib/infra/logger-async";

// ---------- Configuration ----------

const MLC_BASE_URL =
    process.env.MLC_API_URL || "https://portal.themlc.com/api/v1";
const MLC_PUBLIC_SEARCH = "https://www.themlc.com/search";
const MLC_DURP_URL =
    process.env.MLC_DURP_URL || "https://portal.themlc.com/api/v1/durp";

const REQUEST_DELAY_MS = 1500; // Respectful rate limiting
const BULK_BATCH_SIZE = 50; // Max items per bulk request

let lastRequestTime = 0;

// ---------- Circuit Breakers ----------

const mlcApiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 120000,
});

const mlcPublicCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringPeriod: 60000,
});

const mlcDurpCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 120000,
    monitoringPeriod: 180000,
});

// ---------- Throttling ----------

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
    ownershipPercentage?: number;
    registrationDate?: string;
}

export interface MLCRecording {
    id: string;
    title: string;
    isrc: string;
    artist: string;
    label?: string;
    releaseDate?: string;
    matchedWorkId?: string;
    matchedWorkTitle?: string;
    matchStatus: "MATCHED" | "UNMATCHED" | "PENDING";
    usageCount?: number;
    estimatedRoyalty?: number;
}

export interface MLCSearchResult {
    found: boolean;
    works: MLCWork[];
    totalResults: number;
    unclaimedAmount?: number;
}

export interface MLCRecordingSearchResult {
    found: boolean;
    recordings: MLCRecording[];
    totalResults: number;
    unclaimedAmount?: number;
}

export interface MLCBulkMatchRequest {
    items: Array<{
        title: string;
        isrc?: string;
        iswc?: string;
        artist?: string;
        writer?: string;
    }>;
}

export interface MLCBulkMatchResult {
    totalSubmitted: number;
    matched: number;
    unmatched: number;
    pending: number;
    results: Array<{
        inputTitle: string;
        inputIsrc?: string;
        matchedWork?: MLCWork;
        matchedRecording?: MLCRecording;
        status: "MATCHED" | "UNMATCHED" | "PENDING" | "ERROR";
        confidence: number;
        error?: string;
    }>;
}

export interface MLCUnmatchedReport {
    totalUnmatched: number;
    totalEstimatedRoyalties: number;
    recordings: MLCRecording[];
    generatedAt: string;
    nextUpdateExpected?: string;
}

export interface MLCClaimSubmission {
    workId: string;
    isrcAssociations: string[];
    ownershipPercentage: number;
    publisherName: string;
    publisherIPI?: string;
    writerNames: string[];
    writerIPIs?: string[];
}

export interface MLCClaimResult {
    claimId: string;
    status: "SUBMITTED" | "ACCEPTED" | "REJECTED" | "PENDING_REVIEW";
    message?: string;
    estimatedRoyalty?: number;
}

// ---------- Helper Functions ----------

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "RoyaltyRadar/2.0.0 (catalog-audit-engine)",
        "Content-Type": "application/json",
    };
    const apiKey = process.env.MLC_API_KEY;
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }
    return headers;
}

function getDurpHeaders(): Record<string, string> {
    return {
        Accept: "application/json",
        "User-Agent": "RoyaltyRadar/2.0.0 (distributor-portal)",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MLC_DURP_KEY}`,
    };
}

function parseWork(w: Record<string, unknown>): MLCWork {
    return {
        id: (w.id as string) || "",
        title: (w.title as string) || "",
        iswc: (w.iswc as string) || undefined,
        writers: (w.writers as string[]) || [],
        publishers: (w.publishers as string[]) || [],
        status: (w.matchStatus as MLCWork["status"]) || "PENDING",
        claimStatus: (w.claimStatus as MLCWork["claimStatus"]) || undefined,
        matchedRecordings: (w.matchedRecordings as number) || 0,
        ownershipPercentage: (w.ownershipPercentage as number) || undefined,
        registrationDate: (w.registrationDate as string) || undefined,
    };
}

function parseRecording(r: Record<string, unknown>): MLCRecording {
    return {
        id: (r.id as string) || "",
        title: (r.title as string) || "",
        isrc: (r.isrc as string) || "",
        artist: (r.artist as string) || "",
        label: (r.label as string) || undefined,
        releaseDate: (r.releaseDate as string) || undefined,
        matchedWorkId: (r.matchedWorkId as string) || undefined,
        matchedWorkTitle: (r.matchedWorkTitle as string) || undefined,
        matchStatus: (r.matchStatus as MLCRecording["matchStatus"]) || "UNMATCHED",
        usageCount: (r.usageCount as number) || 0,
        estimatedRoyalty: (r.estimatedRoyalty as number) || 0,
    };
}

// ---------- Core API Functions ----------

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
    return searchMLCPublic(title);
}

/**
 * Search The MLC via the bulk data API (requires enrollment).
 * Protected by circuit breaker and retry logic.
 */
async function searchMLCBulkAPI(
    title: string,
    writer?: string
): Promise<MLCSearchResult> {
    return asyncLogger.track("mlc_bulk_api_search", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const params = new URLSearchParams({ title });
                    if (writer) params.set("writer", writer);

                    const res = await fetch(
                        `${MLC_BASE_URL}/works/search?${params}`,
                        { headers: getAuthHeaders() }
                    );

                    if (!res.ok) {
                        const errorMsg = `MLC API error: ${res.status} ${res.statusText}`;
                        asyncLogger.error(errorMsg, new Error(errorMsg), {
                            operation: "mlc_bulk_search",
                            metadata: { title, status: res.status },
                        });
                        throw new Error(errorMsg);
                    }

                    const data = await res.json();
                    const works: MLCWork[] = (data.works || []).map(parseWork);

                    asyncLogger.info("MLC bulk search completed", {
                        operation: "mlc_bulk_search",
                        metadata: { title, resultsFound: works.length },
                    });

                    return {
                        found: works.length > 0,
                        works,
                        totalResults: data.totalResults || works.length,
                        unclaimedAmount: data.unclaimedAmount,
                    };
                },
                {
                    maxRetries: 3,
                    baseDelay: 2000,
                    maxDelay: 10000,
                    retryableErrors: ["ETIMEDOUT", "ECONNRESET", "429", "503"],
                }
            );
        });
    });
}

/**
 * Search The MLC via public search (limited, no API key needed).
 */
async function searchMLCPublic(title: string): Promise<MLCSearchResult> {
    return asyncLogger.track("mlc_public_search", async () => {
        return mlcPublicCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const res = await fetch(
                        `${MLC_PUBLIC_SEARCH}?q=${encodeURIComponent(title)}&type=works`,
                        {
                            headers: {
                                Accept: "application/json",
                                "User-Agent": "RoyaltyRadar/2.0.0 (catalog-audit-engine)",
                            },
                        }
                    );

                    if (!res.ok) {
                        throw new Error(`MLC public search error: ${res.status}`);
                    }

                    const data = await res.json();
                    return {
                        found: (data.results?.length || 0) > 0,
                        works: (data.results || []).map(
                            (r: Record<string, unknown>) => ({
                                id: (r.id as string) || "",
                                title: (r.title as string) || "",
                                iswc: (r.iswc as string) || undefined,
                                writers: (r.writers as string[]) || [],
                                publishers: (r.publishers as string[]) || [],
                                status: "MATCHED" as const,
                            })
                        ),
                        totalResults: data.total || 0,
                    };
                },
                { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
            );
        });
    });
}

/**
 * Search The MLC by ISRC to find matched/unmatched recordings.
 * Critical for the ISRC-to-Work matching workflow.
 */
export async function searchMLCByISRC(
    isrc: string
): Promise<MLCRecordingSearchResult> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        asyncLogger.warn("MLC API key not configured, ISRC search unavailable", {
            operation: "mlc_isrc_search",
        });
        return { found: false, recordings: [], totalResults: 0 };
    }

    return asyncLogger.track("mlc_isrc_search", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const res = await fetch(
                        `${MLC_BASE_URL}/recordings/search?isrc=${encodeURIComponent(isrc)}`,
                        { headers: getAuthHeaders() }
                    );

                    if (!res.ok) {
                        throw new Error(`MLC ISRC search error: ${res.status}`);
                    }

                    const data = await res.json();
                    const recordings: MLCRecording[] = (data.recordings || []).map(parseRecording);

                    return {
                        found: recordings.length > 0,
                        recordings,
                        totalResults: data.totalResults || recordings.length,
                        unclaimedAmount: data.unclaimedAmount,
                    };
                },
                { maxRetries: 3, baseDelay: 2000, maxDelay: 10000 }
            );
        });
    });
}

/**
 * Search The MLC by ISWC (International Standard Musical Work Code).
 */
export async function searchMLCByISWC(
    iswc: string
): Promise<MLCSearchResult> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        return { found: false, works: [], totalResults: 0 };
    }

    return asyncLogger.track("mlc_iswc_search", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const res = await fetch(
                        `${MLC_BASE_URL}/works/search?iswc=${encodeURIComponent(iswc)}`,
                        { headers: getAuthHeaders() }
                    );

                    if (!res.ok) {
                        throw new Error(`MLC ISWC search error: ${res.status}`);
                    }

                    const data = await res.json();
                    const works: MLCWork[] = (data.works || []).map(parseWork);

                    return {
                        found: works.length > 0,
                        works,
                        totalResults: data.totalResults || works.length,
                        unclaimedAmount: data.unclaimedAmount,
                    };
                },
                { maxRetries: 3, baseDelay: 2000, maxDelay: 10000 }
            );
        });
    });
}

// ---------- Bulk Matching ----------

/**
 * Submit a bulk matching request to The MLC.
 * Processes items in batches to respect API limits.
 */
export async function bulkMatchRecordings(
    request: MLCBulkMatchRequest
): Promise<MLCBulkMatchResult> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        asyncLogger.warn("MLC API key not configured, bulk matching unavailable", {
            operation: "mlc_bulk_match",
        });
        return { totalSubmitted: 0, matched: 0, unmatched: 0, pending: 0, results: [] };
    }

    return asyncLogger.track("mlc_bulk_match", async () => {
        const allResults: MLCBulkMatchResult["results"] = [];
        let matched = 0;
        let unmatched = 0;
        let pending = 0;

        for (let i = 0; i < request.items.length; i += BULK_BATCH_SIZE) {
            const batch = request.items.slice(i, i + BULK_BATCH_SIZE);

            asyncLogger.info(
                `Processing MLC bulk match batch ${Math.floor(i / BULK_BATCH_SIZE) + 1}`,
                {
                    operation: "mlc_bulk_match",
                    metadata: { batchStart: i, batchSize: batch.length, totalItems: request.items.length },
                }
            );

            const batchResults = await Promise.allSettled(
                batch.map(async (item) => {
                    try {
                        // Try ISRC search first (most reliable)
                        if (item.isrc) {
                            const isrcResult = await searchMLCByISRC(item.isrc);
                            if (isrcResult.found && isrcResult.recordings.length > 0) {
                                const recording = isrcResult.recordings[0];
                                return {
                                    inputTitle: item.title,
                                    inputIsrc: item.isrc,
                                    matchedRecording: recording,
                                    matchedWork: recording.matchedWorkId
                                        ? { id: recording.matchedWorkId, title: recording.matchedWorkTitle || "", writers: [] as string[], publishers: [] as string[], status: "MATCHED" as const }
                                        : undefined,
                                    status: (recording.matchStatus === "MATCHED" ? "MATCHED" : "UNMATCHED") as const,
                                    confidence: recording.matchStatus === "MATCHED" ? 95 : 0,
                                };
                            }
                        }

                        // Try ISWC search
                        if (item.iswc) {
                            const iswcResult = await searchMLCByISWC(item.iswc);
                            if (iswcResult.found && iswcResult.works.length > 0) {
                                return {
                                    inputTitle: item.title,
                                    inputIsrc: item.isrc,
                                    matchedWork: iswcResult.works[0],
                                    status: "MATCHED" as const,
                                    confidence: 90,
                                };
                            }
                        }

                        // Fall back to title search
                        const titleResult = await searchMLCByTitle(item.title, item.writer);
                        if (titleResult.found && titleResult.works.length > 0) {
                            return {
                                inputTitle: item.title,
                                inputIsrc: item.isrc,
                                matchedWork: titleResult.works[0],
                                status: "MATCHED" as const,
                                confidence: 75,
                            };
                        }

                        return { inputTitle: item.title, inputIsrc: item.isrc, status: "UNMATCHED" as const, confidence: 0 };
                    } catch (error) {
                        return {
                            inputTitle: item.title,
                            inputIsrc: item.isrc,
                            status: "ERROR" as const,
                            confidence: 0,
                            error: error instanceof Error ? error.message : "Unknown error",
                        };
                    }
                })
            );

            for (const result of batchResults) {
                if (result.status === "fulfilled") {
                    allResults.push(result.value);
                    if (result.value.status === "MATCHED") matched++;
                    else if (result.value.status === "UNMATCHED") unmatched++;
                    else if (result.value.status === "PENDING") pending++;
                } else {
                    allResults.push({
                        inputTitle: "Unknown",
                        status: "ERROR",
                        confidence: 0,
                        error: result.reason?.message || "Batch processing error",
                    });
                }
            }

            // Delay between batches
            if (i + BULK_BATCH_SIZE < request.items.length) {
                await new Promise((r) => setTimeout(r, 3000));
            }
        }

        asyncLogger.info("MLC bulk match completed", {
            operation: "mlc_bulk_match",
            metadata: { totalSubmitted: request.items.length, matched, unmatched, pending },
        });

        return { totalSubmitted: request.items.length, matched, unmatched, pending, results: allResults };
    });
}

// ---------- DURP (Distributor Unmatched Recordings Portal) ----------

/**
 * Fetch unmatched recordings from the DURP portal.
 * Requires MLC_DURP_KEY environment variable.
 */
export async function fetchDURPUnmatchedRecordings(
    options: {
        limit?: number;
        offset?: number;
        sortBy?: "usage" | "date" | "title";
        sortOrder?: "asc" | "desc";
    } = {}
): Promise<MLCUnmatchedReport> {
    const durpKey = process.env.MLC_DURP_KEY;
    if (!durpKey) {
        asyncLogger.warn("MLC DURP key not configured", { operation: "mlc_durp_fetch" });
        return { totalUnmatched: 0, totalEstimatedRoyalties: 0, recordings: [], generatedAt: new Date().toISOString() };
    }

    return asyncLogger.track("mlc_durp_fetch", async () => {
        return mlcDurpCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const params = new URLSearchParams({
                        limit: String(options.limit || 100),
                        offset: String(options.offset || 0),
                        sortBy: options.sortBy || "usage",
                        sortOrder: options.sortOrder || "desc",
                    });

                    const res = await fetch(`${MLC_DURP_URL}/unmatched?${params}`, { headers: getDurpHeaders() });

                    if (!res.ok) {
                        throw new Error(`DURP API error: ${res.status}`);
                    }

                    const data = await res.json();
                    const recordings: MLCRecording[] = (data.recordings || []).map(parseRecording);

                    return {
                        totalUnmatched: data.totalUnmatched || recordings.length,
                        totalEstimatedRoyalties: data.totalEstimatedRoyalties || 0,
                        recordings,
                        generatedAt: data.generatedAt || new Date().toISOString(),
                        nextUpdateExpected: data.nextUpdateExpected,
                    };
                },
                { maxRetries: 3, baseDelay: 2000, maxDelay: 15000 }
            );
        });
    });
}

/**
 * Cross-reference a catalog against DURP unmatched recordings.
 */
export async function crossReferenceCatalogWithDURP(
    catalogItems: Array<{ title: string; isrc?: string; iswc?: string; artist?: string }>
): Promise<{
    potentialMatches: Array<{
        catalogItem: (typeof catalogItems)[0];
        unmatchedRecording: MLCRecording;
        confidence: number;
    }>;
    totalChecked: number;
    matchesFound: number;
}> {
    return asyncLogger.track("mlc_durp_cross_reference", async () => {
        const unmatchedReport = await fetchDURPUnmatchedRecordings({ limit: 1000, sortBy: "usage" });

        const potentialMatches: Array<{
            catalogItem: (typeof catalogItems)[0];
            unmatchedRecording: MLCRecording;
            confidence: number;
        }> = [];

        for (const catalogItem of catalogItems) {
            for (const recording of unmatchedReport.recordings) {
                let confidence = 0;

                // ISRC exact match (highest confidence)
                if (catalogItem.isrc && recording.isrc && catalogItem.isrc.toUpperCase() === recording.isrc.toUpperCase()) {
                    confidence = 98;
                }
                // Title similarity check
                else if (catalogItem.title && recording.title) {
                    const normCatalog = catalogItem.title.toLowerCase().trim();
                    const normRecording = recording.title.toLowerCase().trim();
                    if (normCatalog === normRecording) {
                        confidence = 85;
                    } else if (normCatalog.includes(normRecording) || normRecording.includes(normCatalog)) {
                        confidence = 65;
                    }
                }

                // Artist match boosts confidence
                if (confidence > 0 && catalogItem.artist && recording.artist) {
                    const normCatArtist = catalogItem.artist.toLowerCase().trim();
                    const normRecArtist = recording.artist.toLowerCase().trim();
                    if (normCatArtist === normRecArtist) {
                        confidence = Math.min(confidence + 10, 99);
                    }
                }

                if (confidence >= 60) {
                    potentialMatches.push({ catalogItem, unmatchedRecording: recording, confidence });
                }
            }
        }

        potentialMatches.sort((a, b) => b.confidence - a.confidence);

        asyncLogger.info("DURP cross-reference completed", {
            operation: "mlc_durp_cross_reference",
            metadata: { catalogItems: catalogItems.length, unmatchedRecordings: unmatchedReport.recordings.length, matchesFound: potentialMatches.length },
        });

        return { potentialMatches, totalChecked: catalogItems.length, matchesFound: potentialMatches.length };
    });
}

// ---------- Unclaimed Royalties Monitoring ----------

/**
 * Check for unclaimed royalties at The MLC.
 */
export async function checkUnclaimedRoyalties(
    publisherId?: string
): Promise<{ unclaimedAmount: number; unmatchedWorks: MLCWork[]; lastChecked: string }> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        return { unclaimedAmount: 0, unmatchedWorks: [], lastChecked: new Date().toISOString() };
    }

    return asyncLogger.track("mlc_unclaimed_check", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const params = new URLSearchParams({ status: "UNMATCHED" });
                    if (publisherId) params.set("publisherId", publisherId);

                    const res = await fetch(`${MLC_BASE_URL}/works?${params}`, { headers: getAuthHeaders() });

                    if (!res.ok) {
                        throw new Error(`MLC unclaimed check error: ${res.status}`);
                    }

                    const data = await res.json();
                    const unmatchedWorks: MLCWork[] = (data.works || []).map(parseWork);

                    asyncLogger.info("MLC unclaimed royalties check completed", {
                        operation: "mlc_unclaimed_check",
                        metadata: { unclaimedAmount: data.totalUnclaimedAmount || 0, unmatchedCount: unmatchedWorks.length },
                    });

                    return {
                        unclaimedAmount: data.totalUnclaimedAmount || 0,
                        unmatchedWorks,
                        lastChecked: new Date().toISOString(),
                    };
                },
                { maxRetries: 3, baseDelay: 2000, maxDelay: 10000 }
            );
        });
    });
}

/**
 * Monitor for newly unmatched recordings since a given date.
 */
export async function monitorNewUnmatched(
    sinceDate: Date
): Promise<{ newUnmatched: MLCRecording[]; totalNew: number; estimatedRoyalties: number }> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        return { newUnmatched: [], totalNew: 0, estimatedRoyalties: 0 };
    }

    return asyncLogger.track("mlc_monitor_new_unmatched", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const params = new URLSearchParams({
                        status: "UNMATCHED",
                        since: sinceDate.toISOString(),
                        sortBy: "date",
                        sortOrder: "desc",
                    });

                    const res = await fetch(`${MLC_BASE_URL}/recordings?${params}`, { headers: getAuthHeaders() });

                    if (!res.ok) {
                        throw new Error(`MLC monitor unmatched error: ${res.status}`);
                    }

                    const data = await res.json();
                    const recordings: MLCRecording[] = (data.recordings || []).map(parseRecording);
                    const estimatedRoyalties = recordings.reduce((sum, r) => sum + (r.estimatedRoyalty || 0), 0);

                    return { newUnmatched: recordings, totalNew: recordings.length, estimatedRoyalties };
                },
                { maxRetries: 3, baseDelay: 2000, maxDelay: 10000 }
            );
        });
    });
}

// ---------- Claim Submission ----------

/**
 * Submit a claim to The MLC for a matched work.
 */
export async function submitClaim(
    claim: MLCClaimSubmission
): Promise<MLCClaimResult> {
    const apiKey = process.env.MLC_API_KEY;
    if (!apiKey) {
        throw new Error("MLC API key required for claim submission");
    }

    return asyncLogger.track("mlc_claim_submit", async () => {
        return mlcApiCircuitBreaker.execute(async () => {
            return withRetry(
                async () => {
                    await throttle();
                    const res = await fetch(`${MLC_BASE_URL}/claims`, {
                        method: "POST",
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            workId: claim.workId,
                            isrcAssociations: claim.isrcAssociations,
                            ownershipPercentage: claim.ownershipPercentage,
                            publisher: { name: claim.publisherName, ipi: claim.publisherIPI },
                            writers: claim.writerNames.map((name, i) => ({ name, ipi: claim.writerIPIs?.[i] })),
                        }),
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(`MLC claim submission error: ${res.status} - ${errorData.message || res.statusText}`);
                    }

                    const data = await res.json();

                    asyncLogger.info("MLC claim submitted successfully", {
                        operation: "mlc_claim_submit",
                        metadata: { claimId: data.claimId, workId: claim.workId, status: data.status },
                    });

                    return {
                        claimId: data.claimId,
                        status: data.status || "SUBMITTED",
                        message: data.message,
                        estimatedRoyalty: data.estimatedRoyalty,
                    };
                },
                { maxRetries: 2, baseDelay: 3000, maxDelay: 10000 }
            );
        });
    });
}

// ---------- Health & Status ----------

/**
 * Check MLC API health and circuit breaker status.
 */
export function getMLCClientHealth(): {
    bulkApi: { circuitBreakerState: string };
    publicSearch: { circuitBreakerState: string };
    durp: { circuitBreakerState: string };
    configured: { bulkApiKey: boolean; durpKey: boolean };
} {
    return {
        bulkApi: { circuitBreakerState: mlcApiCircuitBreaker.getState() },
        publicSearch: { circuitBreakerState: mlcPublicCircuitBreaker.getState() },
        durp: { circuitBreakerState: mlcDurpCircuitBreaker.getState() },
        configured: { bulkApiKey: !!process.env.MLC_API_KEY, durpKey: !!process.env.MLC_DURP_KEY },
    };
}
