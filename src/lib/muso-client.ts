/**
 * Muso.ai API Client
 *
 * Integrates with Muso.ai's v4 API for verified music credit data,
 * ISRC-based track lookups, profile/discography enrichment, and
 * cross-platform analytics.
 *
 * API Docs: https://developer.muso.ai
 * Base URL: https://api.developer.muso.ai/v4
 * Auth: x-api-key header
 */

const MUSO_BASE_URL = "https://api.developer.muso.ai/v4";

function getHeaders(): Record<string, string> {
    const apiKey = process.env.MUSO_API_KEY;
    if (!apiKey) throw new Error("Missing MUSO_API_KEY environment variable");

    return {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

// ---------- Type Definitions ----------

export interface MusoSearchResult {
    id: string;
    name: string;
    type: "profile" | "album" | "track" | "organization";
    imageUrl?: string;
    roles?: string[];
    popularity?: number;
}

export interface MusoTrack {
    id: string;
    title: string;
    isrc?: string;
    duration?: number;
    bpm?: number;
    popularity?: number;
    spotifyId?: string;
    appleMusicId?: string;
    credits: MusoCredit[];
}

export interface MusoAlbum {
    id: string;
    title: string;
    upc?: string;
    releaseDate?: string;
    label?: string;
    credits: MusoCredit[];
    trackCount?: number;
}

export interface MusoCredit {
    profileId: string;
    name: string;
    role: string;
    roleCategory?: string;
    ipiNameNumber?: string;
    isni?: string;
}

export interface MusoProfile {
    id: string;
    name: string;
    imageUrl?: string;
    roles?: string[];
    ipiNameNumber?: string;
    isni?: string;
    creditCount?: number;
    spotifyId?: string;
}

export interface MusoProfileCredits {
    profileId: string;
    credits: {
        trackId: string;
        trackTitle: string;
        isrc?: string;
        role: string;
        albumTitle?: string;
        releaseDate?: string;
    }[];
    total: number;
}

export interface MusoCollaborator {
    profileId: string;
    name: string;
    sharedCredits: number;
    roles: string[];
}

export interface MusoRole {
    id: string;
    name: string;
    category?: string;
}

// ---------- Search ----------

/**
 * General search across Muso.ai database.
 * Finds profiles, albums, tracks, or organizations.
 */
export async function search(
    keyword: string,
    options: {
        type?: "profile" | "album" | "track" | "organization";
        childCredits?: boolean;
        limit?: number;
    } = {}
): Promise<MusoSearchResult[]> {
    try {
        const res = await fetch(`${MUSO_BASE_URL}/search`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                keyword,
                type: options.type,
                childCredits: options.childCredits ?? false,
                limit: Math.min(options.limit || 20, 50),
            }),
        });

        if (!res.ok) {
            console.error(`Muso search error: ${res.status}`);
            return [];
        }

        const data = await res.json();
        return data.results || data || [];
    } catch (e) {
        console.error("Muso search failed:", e);
        return [];
    }
}

/**
 * Search specifically for credit profiles by name.
 * Can optionally filter by specific track IDs.
 */
export async function searchProfiles(
    names: string[],
    options: { trackIds?: string[]; spotifyTrackIds?: string[] } = {}
): Promise<MusoProfile[]> {
    try {
        const params = new URLSearchParams();
        names.forEach((n) => params.append("names", n));
        if (options.trackIds)
            options.trackIds.forEach((id) => params.append("trackIds", id));
        if (options.spotifyTrackIds)
            options.spotifyTrackIds.forEach((id) =>
                params.append("spotifyTrackIds", id)
            );

        const res = await fetch(
            `${MUSO_BASE_URL}/profiles/search?${params}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        const data = await res.json();
        return data.results || data || [];
    } catch {
        return [];
    }
}

// ---------- Track Lookup ----------

/**
 * Look up a track by ISRC or Muso ID.
 * Returns verified credit data, cross-platform IDs, and metadata.
 */
export async function getTrackByISRC(isrc: string): Promise<MusoTrack | null> {
    return getTrack("isrc", isrc);
}

export async function getTrackById(id: string): Promise<MusoTrack | null> {
    return getTrack("id", id);
}

async function getTrack(
    idKey: "id" | "isrc",
    idValue: string
): Promise<MusoTrack | null> {
    try {
        const res = await fetch(
            `${MUSO_BASE_URL}/track/${idKey}/${encodeURIComponent(idValue)}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return null;
        return (await res.json()) as MusoTrack;
    } catch {
        return null;
    }
}

/**
 * Get all albums a track appears on.
 */
export async function getTrackAlbums(
    idKey: "id" | "isrc",
    idValue: string
): Promise<MusoAlbum[]> {
    try {
        const res = await fetch(
            `${MUSO_BASE_URL}/track/${idKey}/${encodeURIComponent(idValue)}/albums`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        const data = await res.json();
        return data.albums || data || [];
    } catch {
        return [];
    }
}

// ---------- Album Lookup ----------

/**
 * Look up an album by UPC or Muso ID.
 */
export async function getAlbumByUPC(upc: string): Promise<MusoAlbum | null> {
    return getAlbum("upc", upc);
}

export async function getAlbumById(id: string): Promise<MusoAlbum | null> {
    return getAlbum("id", id);
}

async function getAlbum(
    idKey: "id" | "upc",
    idValue: string
): Promise<MusoAlbum | null> {
    try {
        const res = await fetch(
            `${MUSO_BASE_URL}/album/${idKey}/${encodeURIComponent(idValue)}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return null;
        return (await res.json()) as MusoAlbum;
    } catch {
        return null;
    }
}

/**
 * Get all credits for an album.
 */
export async function getAlbumCredits(
    idKey: "id" | "upc",
    idValue: string
): Promise<MusoCredit[]> {
    try {
        const res = await fetch(
            `${MUSO_BASE_URL}/album/${idKey}/${encodeURIComponent(idValue)}/credits`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        const data = await res.json();
        return data.credits || data || [];
    } catch {
        return [];
    }
}

// ---------- Profile & Credits ----------

/**
 * Get a Muso profile by ID.
 */
export async function getProfile(id: string): Promise<MusoProfile | null> {
    try {
        const res = await fetch(`${MUSO_BASE_URL}/profile/${id}`, {
            headers: getHeaders(),
        });

        if (!res.ok) return null;
        return (await res.json()) as MusoProfile;
    } catch {
        return null;
    }
}

/**
 * Get all credits for a profile (paginated).
 */
export async function getProfileCredits(
    id: string,
    options: { limit?: number; offset?: number } = {}
): Promise<MusoProfileCredits | null> {
    try {
        const params = new URLSearchParams();
        if (options.limit)
            params.set("limit", String(Math.min(options.limit, 100)));
        if (options.offset) params.set("offset", String(options.offset));

        const res = await fetch(
            `${MUSO_BASE_URL}/profile/${id}/credits?${params}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return null;
        return (await res.json()) as MusoProfileCredits;
    } catch {
        return null;
    }
}

/**
 * Get collaborators for a profile.
 */
export async function getProfileCollaborators(
    id: string
): Promise<MusoCollaborator[]> {
    try {
        const res = await fetch(
            `${MUSO_BASE_URL}/profile/${id}/collaborators`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        const data = await res.json();
        return data.collaborators || data || [];
    } catch {
        return [];
    }
}

// ---------- Roles ----------

/**
 * List all available credit roles in the Muso database.
 */
export async function getRoles(keyword?: string): Promise<MusoRole[]> {
    try {
        const params = keyword
            ? `?keyword=${encodeURIComponent(keyword)}`
            : "";
        const res = await fetch(`${MUSO_BASE_URL}/roles${params}`, {
            headers: getHeaders(),
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.roles || data || [];
    } catch {
        return [];
    }
}

// ---------- Enrichment Helpers ----------

/**
 * Enrich a recording with verified Muso.ai credits.
 * Given an ISRC, returns all verified contributors with their roles and IPI numbers.
 */
export async function enrichRecordingCredits(isrc: string): Promise<{
    found: boolean;
    credits: MusoCredit[];
    spotifyId?: string;
    popularity?: number;
} | null> {
    const track = await getTrackByISRC(isrc);
    if (!track) return { found: false, credits: [] };

    return {
        found: true,
        credits: track.credits || [],
        spotifyId: track.spotifyId,
        popularity: track.popularity,
    };
}

/**
 * Bulk enrich multiple ISRCs with credits.
 * Rate-limited to be respectful of Muso API.
 */
export async function bulkEnrichCredits(
    isrcs: string[]
): Promise<Map<string, MusoCredit[]>> {
    const results = new Map<string, MusoCredit[]>();

    for (const isrc of isrcs) {
        const enriched = await enrichRecordingCredits(isrc);
        if (enriched?.found) {
            results.set(isrc, enriched.credits);
        }
        // Rate limit: 200ms between requests
        await new Promise((r) => setTimeout(r, 200));
    }

    return results;
}

/**
 * Find a writer's Muso profile and IPI number by name.
 * Useful for filling in missing IPI/CAE numbers in registration data.
 */
export async function findWriterIPI(
    writerName: string
): Promise<{ ipiNameNumber: string | null; musoProfileId: string | null }> {
    const profiles = await searchProfiles([writerName]);
    if (profiles.length === 0)
        return { ipiNameNumber: null, musoProfileId: null };

    const profile = profiles[0];
    return {
        ipiNameNumber: profile.ipiNameNumber || null,
        musoProfileId: profile.id,
    };
}
