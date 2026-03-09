import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { withErrorHandler, ApiErrors } from "@/lib/api/error-handler";
import { search } from "@/lib/clients/muso-client";

/**
 * POST /api/settings/integrations/test
 *
 * Tests the connectivity of an external API integration.
 */
export const POST = withErrorHandler(async (req: Request) => {
    const { role } = await requireAuth();
    validatePermission(role, "SETTINGS_EDIT");

    const body = await req.json();
    const { integrationId } = body;

    if (typeof integrationId !== "string" || !integrationId) {
        return ApiErrors.BadRequest("integrationId is required");
    }

    switch (integrationId) {
        case "muso": {
            if (!process.env.MUSO_API_KEY) {
                return NextResponse.json({ success: false, message: "MUSO_API_KEY not configured" });
            }
            const results = await search("test", { limit: 1 });
            return NextResponse.json({
                success: true,
                message: `Muso.ai connected — ${results.length > 0 ? "API responding" : "API reachable (no results for test query)"}`,
            });
        }

        case "spotify": {
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                return NextResponse.json({ success: false, message: "Spotify credentials not configured" });
            }
            const { searchByISRC } = await import("@/lib/clients/spotify");
            const track = await searchByISRC("USUM71703861"); // Known ISRC
            return NextResponse.json({
                success: true,
                message: track ? `Spotify connected — found "${track.name}"` : "Spotify API reachable",
            });
        }

        case "musicbrainz": {
            const { searchArtist } = await import("@/lib/clients/musicbrainz-client");
            const artists = await searchArtist("Beatles");
            return NextResponse.json({
                success: true,
                message: artists.length > 0 ? "MusicBrainz connected" : "MusicBrainz reachable",
            });
        }

        default:
            return NextResponse.json({ success: false, message: `Test not available for "${integrationId}"` });
    }
});
