/**
 * Enhanced Metadata Enrichment with Retry Logic and Error Handling
 * 
 * Provides robust metadata enrichment with:
 * - Exponential backoff retry for transient failures
 * - Circuit breaker pattern for external services
 * - Comprehensive error handling and logging
 * - Fallback strategies
 */

import { searchByISRC, searchByTitle } from "@/lib/clients/spotify";
import { enrichRecordingCredits } from "@/lib/clients/muso-client";
import { withRetry, CircuitBreaker } from "./retry";
import { asyncLogger } from "./logger-async";

export interface EnrichmentMatch {
    found: boolean;
    externalIswc?: string;
    externalIsrc?: string;
    globalSharePercent?: number;
    matchScore: number;
    provider: string;
    spotifyUri?: string;
    credits?: { name: string; role: string; ipiNameNumber?: string }[];
    suggestions?: {
        field: string;
        value: string | number;
        reason: string;
    }[];
}

// Circuit breakers for external services
const spotifyCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
});

const musoCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 120000, // 2 minutes
    monitoringPeriod: 180000, // 3 minutes
});

const musicbrainzCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
});

/**
 * Enrich metadata from Spotify with retry logic
 */
async function enrichFromSpotify(
    title: string,
    currentId?: string | null
): Promise<EnrichmentMatch | null> {
    if (!process.env.SPOTIFY_CLIENT_ID) {
        asyncLogger.debug('Spotify client ID not configured');
        return null;
    }

    try {
        return await spotifyCircuitBreaker.execute(async () => {
            return await withRetry(
                async () => {
                    let spotifyTrack = null;
                    
                    if (currentId && !currentId.startsWith("T-")) {
                        asyncLogger.debug('Searching Spotify by ISRC', { isrc: currentId });
                        spotifyTrack = await searchByISRC(currentId);
                    } else if (!currentId) {
                        asyncLogger.debug('Searching Spotify by title', { title });
                        spotifyTrack = await searchByTitle(title);
                    }

                    if (spotifyTrack) {
                        const suggestions = [];
                        if (spotifyTrack.external_ids.isrc) {
                            suggestions.push({
                                field: "isrc",
                                value: spotifyTrack.external_ids.isrc,
                                reason: "Verified ISRC from Spotify"
                            });
                        }
                        suggestions.push({
                            field: "title",
                            value: spotifyTrack.name,
                            reason: "Canonical title from Spotify"
                        });

                        asyncLogger.info('Spotify enrichment successful', {
                            title,
                            found: true,
                            suggestions: suggestions.length
                        });

                        return {
                            found: true,
                            externalIsrc: spotifyTrack.external_ids.isrc,
                            matchScore: 100,
                            provider: "Spotify",
                            spotifyUri: spotifyTrack.uri,
                            suggestions
                        };
                    }

                    return null;
                },
                {
                    maxAttempts: 3,
                    initialDelay: 500,
                    maxDelay: 5000,
                    retryableErrors: ['ETIMEDOUT', 'ECONNRESET', '429', '503', '504'],
                    onRetry: (attempt, error) => {
                        asyncLogger.warn(
                            `Spotify enrichment retry attempt ${attempt}`,
                            { title, currentId, error: error.message }
                        );
                    }
                }
            );
        });
    } catch (error) {
        asyncLogger.error('Spotify enrichment failed', error as Error, { title, currentId });
        return null;
    }
}

/**
 * Enrich metadata from Muso.ai with retry logic
 */
async function enrichFromMuso(
    title: string,
    currentId?: string | null
): Promise<EnrichmentMatch | null> {
    if (!process.env.MUSO_API_KEY) {
        asyncLogger.debug('Muso.ai API key not configured');
        return null;
    }

    try {
        return await musoCircuitBreaker.execute(async () => {
            const isrcToCheck = currentId && !currentId.startsWith("T-") ? currentId : undefined;
            
            if (!isrcToCheck) {
                asyncLogger.debug('No ISRC available for Muso enrichment');
                return null;
            }

            return await withRetry(
                async () => {
                    asyncLogger.debug('Searching Muso.ai by ISRC', { isrc: isrcToCheck });
                    const musoResult = await enrichRecordingCredits(isrcToCheck);
                    
                    if (musoResult?.found && musoResult.credits.length > 0) {
                        const creditSuggestions = musoResult.credits.map((c) => ({
                            field: "credit",
                            value: `${c.name} (${c.role})`,
                            reason: `Verified credit from Muso.ai${c.ipiNameNumber ? ` — IPI: ${c.ipiNameNumber}` : ""}`,
                        }));

                        asyncLogger.info('Muso.ai enrichment successful', {
                            isrc: isrcToCheck,
                            creditsCount: musoResult.credits.length
                        });

                        return {
                            found: true,
                            externalIsrc: isrcToCheck,
                            matchScore: 95,
                            provider: "Muso.ai",
                            credits: musoResult.credits.map((c) => ({
                                name: c.name,
                                role: c.role,
                                ipiNameNumber: c.ipiNameNumber || undefined,
                            })),
                            suggestions: creditSuggestions,
                        };
                    }

                    return null;
                },
                {
                    maxAttempts: 2,
                    initialDelay: 1000,
                    maxDelay: 5000,
                    retryableErrors: ['ETIMEDOUT', 'ECONNRESET', '429', '503'],
                    onRetry: (attempt, error) => {
                        asyncLogger.warn(
                            `Muso.ai enrichment retry attempt ${attempt}`,
                            { isrc: isrcToCheck, error: error.message }
                        );
                    }
                }
            );
        });
    } catch (error) {
        asyncLogger.error('Muso.ai enrichment failed', error as Error, { title, currentId });
        return null;
    }
}

/**
 * Enrich metadata from MusicBrainz with retry logic
 */
async function enrichFromMusicBrainz(
    title: string,
    currentId?: string | null
): Promise<EnrichmentMatch | null> {
    try {
        return await musicbrainzCircuitBreaker.execute(async () => {
            return await withRetry(
                async () => {
                    const queryType = currentId?.startsWith("T-") || (!currentId && title) 
                        ? 'work' 
                        : 'recording';
                    const url = `https://musicbrainz.org/ws/2/${queryType}/?query=${queryType}:${encodeURIComponent(title)}&fmt=json`;

                    asyncLogger.debug('Searching MusicBrainz', { queryType, title });

                    const res = await fetch(url, {
                        headers: {
                            'User-Agent': 'RoyaltyRadar/1.0.0 ( cody@royaltyradar.com )',
                            'Accept': 'application/json'
                        },
                        signal: AbortSignal.timeout(10000) // 10 second timeout
                    });

                    if (!res.ok) {
                        throw new Error(`MusicBrainz API error: ${res.status} ${res.statusText}`);
                    }

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
                                    suggestions.push({
                                        field: "iswc",
                                        value: externalIswc,
                                        reason: "ISWC retrieved from MusicBrainz"
                                    });
                                }
                            }
                        } else if (queryType === 'recording') {
                            if (bestMatch.isrcs && bestMatch.isrcs.length > 0) {
                                externalIsrc = bestMatch.isrcs[0].id || bestMatch.isrcs[0];
                                if (externalIsrc !== currentId) {
                                    suggestions.push({
                                        field: "isrc",
                                        value: externalIsrc,
                                        reason: "ISRC retrieved from MusicBrainz"
                                    });
                                }
                            }
                        }

                        if (bestMatch.title && bestMatch.title.toLowerCase() !== title.toLowerCase()) {
                            suggestions.push({
                                field: "title",
                                value: bestMatch.title,
                                reason: "Canonical title from MusicBrainz"
                            });
                        }

                        asyncLogger.info('MusicBrainz enrichment successful', {
                            title,
                            queryType,
                            matchScore,
                            suggestions: suggestions.length
                        });

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

                    return null;
                },
                {
                    maxAttempts: 3,
                    initialDelay: 1000,
                    maxDelay: 5000,
                    retryableErrors: ['ETIMEDOUT', 'ECONNRESET', '503', '504'],
                    onRetry: (attempt, error) => {
                        asyncLogger.warn(
                            `MusicBrainz enrichment retry attempt ${attempt}`,
                            { title, queryType: currentId?.startsWith("T-") ? 'work' : 'recording', error: error.message }
                        );
                    }
                }
            );
        });
    } catch (error) {
        asyncLogger.error('MusicBrainz enrichment failed', error as Error, { title, currentId });
        return null;
    }
}

/**
 * Main enrichment function with fallback strategy
 */
export async function enrichMetadata(title: string, currentId?: string | null): Promise<EnrichmentMatch> {
    asyncLogger.info('Starting metadata enrichment', { title, currentId });

    // Try Spotify first (highest quality)
    const spotifyResult = await enrichFromSpotify(title, currentId);
    if (spotifyResult && spotifyResult.found) {
        return spotifyResult;
    }

    // Try Muso.ai for credits (if we have ISRC)
    if (currentId && !currentId.startsWith("T-")) {
        const musoResult = await enrichFromMuso(title, currentId);
        if (musoResult && musoResult.found) {
            return musoResult;
        }
    }

    // Try MusicBrainz as fallback
    const musicbrainzResult = await enrichFromMusicBrainz(title, currentId);
    if (musicbrainzResult && musicbrainzResult.found) {
        return musicbrainzResult;
    }

    asyncLogger.warn('No enrichment data found', { title, currentId });
    return { found: false, matchScore: 0, provider: "None" };
}

/**
 * Get circuit breaker states for monitoring
 */
export function getEnrichmentCircuitBreakerStates() {
    return {
        spotify: spotifyCircuitBreaker.getState(),
        muso: musoCircuitBreaker.getState(),
        musicbrainz: musicbrainzCircuitBreaker.getState(),
    };
}

/**
 * Reset circuit breakers (for manual intervention)
 */
export function resetEnrichmentCircuitBreakers() {
    spotifyCircuitBreaker.reset();
    musoCircuitBreaker.reset();
    musicbrainzCircuitBreaker.reset();
    asyncLogger.info('Enrichment circuit breakers reset');
}