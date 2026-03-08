import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { HaawkClient } from "@/lib/clients/haawk-client";

/**
 * GET /api/recordings/[id]/content-id
 * Get Content ID monitoring status for a specific recording
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = (session.user as any).orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization found" }, { status: 403 });
        }

        const { id } = await params;

        // Get recording with Content ID monitors
        const recording = await db.recording.findFirst({
            where: { id, orgId },
            include: {
                contentIdMonitors: {
                    include: {
                        usages: {
                            orderBy: { detectedAt: "desc" },
                            take: 10,
                        }
                    }
                }
            }
        });

        if (!recording) {
            return NextResponse.json({ error: "Recording not found" }, { status: 404 });
        }

        // Calculate totals
        const totalViews = recording.contentIdMonitors.reduce((sum, m) => sum + m.totalViews, 0);
        const totalClaims = recording.contentIdMonitors.reduce((sum, m) => sum + m.totalClaims, 0);
        const totalRevenue = recording.contentIdMonitors.reduce((sum, m) => sum + m.estimatedRevenue, 0);

        return NextResponse.json({
            recordingId: recording.id,
            title: recording.title,
            isrc: recording.isrc,
            artistName: recording.artistName,
            monitors: recording.contentIdMonitors.map(m => ({
                id: m.id,
                platform: m.platform,
                assetId: m.assetId,
                registrationStatus: m.registrationStatus,
                policy: m.policy,
                totalViews: m.totalViews,
                totalClaims: m.totalClaims,
                estimatedRevenue: m.estimatedRevenue,
                lastCheckedAt: m.lastCheckedAt,
                recentUsages: m.usages.map(u => ({
                    id: u.id,
                    videoId: u.videoId,
                    videoTitle: u.videoTitle,
                    channelName: u.channelName,
                    viewCount: u.viewCount,
                    estimatedRevenue: u.estimatedRevenue,
                    detectedAt: u.detectedAt,
                })),
            })),
            summary: {
                totalViews,
                totalClaims,
                totalRevenue,
                platforms: recording.contentIdMonitors.map(m => m.platform),
            }
        });
    } catch (error: any) {
        console.error("Error fetching Content ID status:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch Content ID status" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/recordings/[id]/content-id
 * Submit a recording for Content ID monitoring
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = (session.user as any).orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization found" }, { status: 403 });
        }

        const { id } = await params;
        const haawk = new HaawkClient();

        // Submit the recording to Content ID
        const result = await haawk.submitRecording(id, {
            platforms: ["YouTube", "Facebook", "Instagram", "TikTok"],
            policy: "MONETIZE"
        });

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("Error submitting to Content ID:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit recording" },
            { status: 500 }
        );
    }
}
