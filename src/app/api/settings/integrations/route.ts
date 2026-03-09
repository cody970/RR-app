import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { withErrorHandler } from "@/lib/api/error-handler";

interface IntegrationStatus {
    id: string;
    name: string;
    description: string;
    configured: boolean;
    status: "connected" | "not_configured" | "error";
    envVar: string;
}

function checkEnv(key: string): boolean {
    return !!process.env[key]?.trim();
}

/**
 * GET /api/settings/integrations
 *
 * Returns the configuration status of all external API integrations.
 * Does not expose actual API keys — only whether they are set.
 */
export const GET = withErrorHandler(async () => {
    const { role } = await requireAuth();
    validatePermission(role, "SETTINGS_EDIT");

    const integrations: IntegrationStatus[] = [
        {
            id: "muso",
            name: "Muso.ai",
            description: "Verified music credits, IPI lookups, and cross-platform metadata enrichment.",
            configured: checkEnv("MUSO_API_KEY"),
            status: checkEnv("MUSO_API_KEY") ? "connected" : "not_configured",
            envVar: "MUSO_API_KEY",
        },
        {
            id: "spotify",
            name: "Spotify",
            description: "ISRC validation, track metadata, and popularity data via Spotify Web API.",
            configured: checkEnv("SPOTIFY_CLIENT_ID") && checkEnv("SPOTIFY_CLIENT_SECRET"),
            status:
                checkEnv("SPOTIFY_CLIENT_ID") && checkEnv("SPOTIFY_CLIENT_SECRET")
                    ? "connected"
                    : "not_configured",
            envVar: "SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET",
        },
        {
            id: "haawk",
            name: "Haawk Content ID",
            description: "Audio fingerprinting and Content ID monitoring for YouTube and Facebook.",
            configured: checkEnv("HAAWK_API_KEY"),
            status: checkEnv("HAAWK_API_KEY") ? "connected" : "not_configured",
            envVar: "HAAWK_API_KEY",
        },
        {
            id: "soundexchange",
            name: "SoundExchange",
            description: "Digital performance royalty lookups and ISRC cross-reference.",
            configured: checkEnv("SOUNDEXCHANGE_API_KEY"),
            status: checkEnv("SOUNDEXCHANGE_API_KEY") ? "connected" : "not_configured",
            envVar: "SOUNDEXCHANGE_API_KEY",
        },
        {
            id: "tuneregistry",
            name: "TuneRegistry",
            description: "Work and recording registration with PROs and The MLC.",
            configured: checkEnv("TUNEREGISTRY_API_KEY"),
            status: checkEnv("TUNEREGISTRY_API_KEY") ? "connected" : "not_configured",
            envVar: "TUNEREGISTRY_API_KEY",
        },
        {
            id: "musicbrainz",
            name: "MusicBrainz",
            description: "Open music metadata — ISRC↔ISWC cross-reference, work relationships, artist data.",
            configured: true, // No key required
            status: "connected",
            envVar: "(no key required)",
        },
    ];

    return NextResponse.json({ integrations });
});
