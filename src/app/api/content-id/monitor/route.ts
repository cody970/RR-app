/**
 * Content ID Monitoring API
 *
 * GET  /api/content-id/monitor — Get monitoring status and claims data
 * POST /api/content-id/monitor — Submit recordings for Content ID monitoring
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { HaawkClient } from "@/lib/clients/haawk-client";

// ---------- GET — Monitoring Dashboard Data ----------

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const orgId = session.user.orgId;
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "overview"; // overview, claims, unregistered

    try {
        const result: Record<string, unknown> = { view };

        // ---------- Overview ----------
        if (view === "overview" || view === "all") {
            // Total recordings and those with Content ID monitors
            const [totalRecordings, monitoredRecordings, totalPlacements] = await Promise.all([
                db.recording.count({ where: { orgId } }),
                db.contentIdMonitor.groupBy({
                    by: ["recordingId"],
                    where: {
                        orgId,
                        registrationStatus: "REGISTERED",
                    },
                }),
                db.contentIdMonitor.count({
                    where: {
                        orgId,
                        registrationStatus: "REGISTERED",
                    },
                }),
            ]);

            // Revenue from Content ID monitors
            const revenueAgg = await db.contentIdMonitor.aggregate({
                where: {
                    orgId,
                    registrationStatus: "REGISTERED",
                },
                _sum: { estimatedRevenue: true },
            });

            // Unregistered recordings (no Content ID monitor)
            const registeredIds = monitoredRecordings.map((r) => r.recordingId);
            const unregisteredCount = await db.recording.count({
                where: {
                    orgId,
                    id: { notIn: registeredIds.length > 0 ? registeredIds : ["__none__"] },
                },
            });

            // Content ID findings
            const contentIdFindings = await db.finding.count({
                where: {
                    orgId,
                    type: "CONTENT_ID_UNREGISTERED",
                },
            });

            result.overview = {
                totalRecordings,
                monitoredRecordings: monitoredRecordings.length,
                unregisteredRecordings: unregisteredCount,
                totalPlacements,
                estimatedRevenue: revenueAgg._sum.estimatedRevenue || 0,
                coveragePercent: totalRecordings > 0
                    ? Math.round((monitoredRecordings.length / totalRecordings) * 100)
                    : 0,
                openFindings: contentIdFindings,
            };
        }

        // ---------- Claims / Active Monitors ----------
        if (view === "claims" || view === "all") {
            const monitors = await db.contentIdMonitor.findMany({
                where: {
                    orgId,
                    registrationStatus: "REGISTERED",
                },
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                    recording: {
                        select: {
                            id: true,
                            title: true,
                            isrc: true,
                            artistName: true,
                        },
                    },
                },
            });

            result.claims = monitors.map((m) => ({
                id: m.id,
                recordingId: m.recordingId,
                recordingTitle: m.recording.title,
                isrc: m.recording.isrc,
                artist: m.recording.artistName,
                platform: m.platform,
                status: m.registrationStatus,
                estimatedRevenue: m.estimatedRevenue,
                totalViews: m.totalViews,
                totalClaims: m.totalClaims,
                lastCheckedAt: m.lastCheckedAt,
                createdAt: m.createdAt,
            }));
        }

        // ---------- Unregistered Recordings ----------
        if (view === "unregistered" || view === "all") {
            // Find recordings without Content ID monitors
            const registeredRecordingIds = await db.contentIdMonitor.findMany({
                where: {
                    orgId,
                    registrationStatus: "REGISTERED",
                },
                select: { recordingId: true },
                distinct: ["recordingId"],
            });

            const registeredIds = registeredRecordingIds.map((r) => r.recordingId);

            const unregistered = await db.recording.findMany({
                where: {
                    orgId,
                    id: { notIn: registeredIds.length > 0 ? registeredIds : ["__none__"] },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
                select: {
                    id: true,
                    title: true,
                    isrc: true,
                    artistName: true,
                    createdAt: true,
                },
            });

            // Map artistName to artist for frontend compatibility
            result.unregistered = unregistered.map(r => ({
                id: r.id,
                title: r.title,
                isrc: r.isrc,
                artist: r.artistName,
                createdAt: r.createdAt,
            }));
        }

        // ---------- Detected Usages ----------
        if (view === "usages" || view === "all") {
            const usages = await db.contentIdUsage.findMany({
                where: {
                    monitor: { orgId },
                },
                orderBy: { detectedAt: "desc" },
                take: 100,
                include: {
                    monitor: {
                        include: {
                            recording: {
                                select: {
                                    id: true,
                                    title: true,
                                    isrc: true,
                                    artistName: true,
                                }
                            }
                        }
                    }
                }
            });

            result.usages = usages.map(u => ({
                id: u.id,
                recordingId: u.monitor.recordingId,
                recordingTitle: u.monitor.recording.title,
                isrc: u.monitor.recording.isrc,
                artist: u.monitor.recording.artistName,
                platform: u.platform,
                videoId: u.videoId,
                videoTitle: u.videoTitle,
                channelName: u.channelName,
                viewCount: u.viewCount,
                claimStatus: u.claimStatus,
                estimatedRevenue: u.estimatedRevenue,
                usageDurationSec: u.usageDurationSec,
                detectedAt: u.detectedAt,
            }));
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Content ID monitor error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------- POST — Submit for Monitoring ----------

const submitSchema = z.object({
    recordingIds: z.array(z.string()).min(1).max(50),
    platforms: z.array(z.string()).min(1).default(["YouTube", "Facebook", "Instagram", "TikTok"]),
    policy: z.enum(["MONETIZE", "BLOCK", "TRACK"]).default("MONETIZE"),
    createFindings: z.boolean().default(false),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "CATALOG_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = submitSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { recordingIds, platforms, policy, createFindings } = parsed.data;
        const orgId = session.user.orgId;

        // Verify recordings belong to this org
        const recordings = await db.recording.findMany({
            where: { id: { in: recordingIds }, orgId },
            select: { id: true, title: true, isrc: true },
        });

        if (recordings.length === 0) {
            return NextResponse.json(
                { error: "No valid recordings found" },
                { status: 404 },
            );
        }

        const client = new HaawkClient();
        const results: Array<{
            recordingId: string;
            success: boolean;
            assetId?: string;
            monitors?: Array<{ platform: string; monitorId: string }>;
            error?: string;
        }> = [];

        for (const recording of recordings) {
            try {
                const result = await client.submitRecording(recording.id, {
                    platforms,
                    policy,
                });
                results.push({
                    recordingId: recording.id,
                    success: result.success,
                    assetId: result.assetId,
                    monitors: result.monitors,
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error";
                results.push({
                    recordingId: recording.id,
                    success: false,
                    error: message,
                });
            }
        }

        // Optionally create findings for recordings that failed to register
        if (createFindings) {
            const unregisteredIds = recordingIds.filter(
                (id) => !results.find((r) => r.recordingId === id && r.success),
            );

            if (unregisteredIds.length > 0) {
                await db.finding.createMany({
                    data: unregisteredIds.map((id) => ({
                        type: "CONTENT_ID_UNREGISTERED",
                        severity: "MEDIUM",
                        status: "OPEN",
                        confidence: 80,
                        estimatedImpact: 0,
                        resourceType: "Recording",
                        resourceId: id,
                        orgId,
                    })),
                    skipDuplicates: true,
                });
            }
        }

        const submitted = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return NextResponse.json({
            submitted,
            failed,
            total: recordings.length,
            results,
        });
    } catch (error: unknown) {
        console.error("Content ID submit error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}