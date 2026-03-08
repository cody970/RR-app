/**
 * Spotify Web API Client
 * Uses Client Credentials flow for server-to-server metadata lookups.
 */

let spotifyToken: { value: string; expires: number } | null = null;
// In-flight refresh promise: ensures concurrent callers share one token request
let tokenRefreshPromise: Promise<string> | null = null;

async function refreshSpotifyToken(): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Spotify credentials in environment");
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Spotify auth failed: ${err}`);
    }

    const data = await res.json();
    spotifyToken = {
        value: data.access_token,
        expires: Date.now() + data.expires_in * 1000 - 60000, // Expire 1 min early
    };

    return spotifyToken.value;
}

async function getSpotifyToken(): Promise<string> {
    if (spotifyToken && spotifyToken.expires > Date.now()) {
        return spotifyToken.value;
    }

    // If a refresh is already in flight, reuse it to prevent concurrent token requests
    if (tokenRefreshPromise) {
        return tokenRefreshPromise;
    }

    tokenRefreshPromise = refreshSpotifyToken().finally(() => {
        tokenRefreshPromise = null;
    });

    return tokenRefreshPromise;
}

export interface SpotifyTrack {
    name: string;
    artists: { name: string }[];
    external_ids: { isrc?: string };
    popularity: number;
    preview_url: string | null;
    uri: string;
}

/**
 * Validates an ISRC via Spotify API.
 */
export async function searchByISRC(isrc: string): Promise<SpotifyTrack | null> {
    try {
        const token = await getSpotifyToken();
        const res = await fetch(`https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.tracks.items[0] || null;
    } catch (e) {
        console.error("Spotify ISRC search error:", e);
        return null;
    }
}

/**
 * Searches for a track by title and optional artist.
 */
export async function searchByTitle(title: string, artist?: string): Promise<SpotifyTrack | null> {
    try {
        const token = await getSpotifyToken();
        const query = encodeURIComponent(`track:${title}${artist ? ` artist:${artist}` : ""}`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.tracks.items[0] || null;
    } catch (e) {
        console.error("Spotify Title search error:", e);
        return null;
    }
}
