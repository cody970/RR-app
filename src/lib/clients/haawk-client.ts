import { db as prisma } from "@/lib/infra/db";

/**
 * HAAWK/Content ID API Client
 * 
 * Integrates with audio fingerprinting and Content ID monitoring services.
 * In a production environment, this would connect to:
 * - YouTube Content ID API
 * - Audible Magic
 * - Pex
 * - Other cross-platform monitoring services
 */

// Types for Content ID operations
export interface ContentIdSubmitOptions {
    platforms: string[];
    policy: "MONETIZE" | "BLOCK" | "TRACK";
}

export interface ContentIdUsageData {
    videoId: string;
    videoTitle: string;
    channelName: string;
    platform: string;
    viewCount: number;
    estimatedRevenue: number;
    usageDurationSec?: number;
    detectedAt: Date;
}

export interface MonitoringReport {
    totalClaims: number;
    totalViews: number;
    estimatedRevenue: number;
    newUsages: ContentIdUsageData[];
}

export class HaawkClient {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.HAAWK_API_KEY || "mock-haawk-key";
        this.baseUrl = process.env.HAAWK_API_URL || "https://api.haawk.com/v1";
    }

    /**
     * Submit a recording for Content ID monitoring across platforms.
     * Creates ContentIdMonitor records for each platform.
     */
    async submitRecording(recordingId: string, options: ContentIdSubmitOptions): Promise<{
        success: boolean;
        assetId: string;
        monitors: Array<{ platform: string; monitorId: string }>;
        message: string;
    }> {
        console.log(`[HAAWK API] Submitting recording ${recordingId} for Content ID...`);
        console.log(`[HAAWK API] Platforms: ${options.platforms.join(", ")} | Policy: ${options.policy}`);

        const recording = await prisma.recording.findUnique({
            where: { id: recordingId },
            include: { work: true, organization: true }
        });

        if (!recording) throw new Error("Recording not found");

        // Mock audio fingerprint generation
        const fingerprint = `FP-${recording.isrc || recording.id}-${Date.now().toString(36)}`;
        
        // Mock successful API response - generate external asset ID
        const externalAssetId = `HAAWK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const monitors: Array<{ platform: string; monitorId: string }> = [];

        // Create ContentIdMonitor records for each platform
        for (const platform of options.platforms) {
            const monitor = await prisma.contentIdMonitor.upsert({
                where: {
                    recordingId_platform: {
                        recordingId,
                        platform
                    }
                },
                create: {
                    recordingId,
                    orgId: recording.orgId,
                    platform,
                    assetId: `${externalAssetId}-${platform.toUpperCase()}`,
                    registrationStatus: "REGISTERED",
                    policy: options.policy,
                    fingerprint,
                    lastCheckedAt: new Date(),
                },
                update: {
                    assetId: `${externalAssetId}-${platform.toUpperCase()}`,
                    registrationStatus: "REGISTERED",
                    policy: options.policy,
                    fingerprint,
                    lastCheckedAt: new Date(),
                    error: null,
                }
            });

            monitors.push({ platform, monitorId: monitor.id });
        }

        return {
            success: true,
            assetId: externalAssetId,
            monitors,
            message: `Recording successfully submitted to Content ID networks (${options.platforms.join(", ")})`
        };
    }

    /**
     * Check for new Content ID usages/claims across all platforms for a recording.
     * Updates the ContentIdMonitor and creates new ContentIdUsage records.
     */
    async checkForUsages(monitorId: string): Promise<MonitoringReport> {
        console.log(`[HAAWK API] Checking for usages on monitor ${monitorId}...`);

        const monitor = await prisma.contentIdMonitor.findUnique({
            where: { id: monitorId },
            include: { recording: true }
        });

        if (!monitor) throw new Error("Monitor not found");

        // Mock API call - in production this would call the actual Content ID API
        // Simulate discovering new usages with some probability
        const hasNewUsages = Math.random() > 0.6;
        const newUsages: ContentIdUsageData[] = [];
        
        if (hasNewUsages) {
            const usageCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < usageCount; i++) {
                const usage: ContentIdUsageData = {
                    videoId: `VID-${Math.random().toString(36).substring(2, 10)}`,
                    videoTitle: `Video featuring "${monitor.recording.title}"`,
                    channelName: `Creator_${Math.floor(Math.random() * 10000)}`,
                    platform: monitor.platform,
                    viewCount: Math.floor(Math.random() * 50000) + 100,
                    estimatedRevenue: Math.random() * 25,
                    usageDurationSec: Math.floor(Math.random() * 180) + 15,
                    detectedAt: new Date(),
                };
                newUsages.push(usage);

                // Create ContentIdUsage record
                await prisma.contentIdUsage.create({
                    data: {
                        monitorId: monitor.id,
                        platform: usage.platform,
                        videoId: usage.videoId,
                        videoTitle: usage.videoTitle,
                        channelName: usage.channelName,
                        viewCount: usage.viewCount,
                        claimStatus: "ACTIVE",
                        estimatedRevenue: usage.estimatedRevenue,
                        usageDurationSec: usage.usageDurationSec,
                        detectedAt: usage.detectedAt,
                    }
                });
            }
        }

        // Aggregate totals
        const aggregates = await prisma.contentIdUsage.aggregate({
            where: { monitorId: monitor.id },
            _sum: {
                viewCount: true,
                estimatedRevenue: true,
            },
            _count: true,
        });

        // Update monitor with latest stats
        await prisma.contentIdMonitor.update({
            where: { id: monitor.id },
            data: {
                lastCheckedAt: new Date(),
                totalViews: aggregates._sum.viewCount || 0,
                totalClaims: aggregates._count,
                estimatedRevenue: aggregates._sum.estimatedRevenue || 0,
            }
        });

        return {
            totalClaims: aggregates._count,
            totalViews: aggregates._sum.viewCount || 0,
            estimatedRevenue: aggregates._sum.estimatedRevenue || 0,
            newUsages,
        };
    }

    /**
     * Scan all registered monitors for an organization and check for new usages.
     * Used by the background worker for periodic monitoring.
     */
    async scanOrgForUsages(orgId: string): Promise<{
        monitorsChecked: number;
        newUsagesFound: number;
        totalEstimatedRevenue: number;
    }> {
        console.log(`[HAAWK API] Scanning organization ${orgId} for Content ID usages...`);

        const monitors = await prisma.contentIdMonitor.findMany({
            where: { 
                orgId,
                registrationStatus: "REGISTERED" 
            }
        });

        let newUsagesFound = 0;
        let totalEstimatedRevenue = 0;

        for (const monitor of monitors) {
            try {
                const report = await this.checkForUsages(monitor.id);
                newUsagesFound += report.newUsages.length;
                totalEstimatedRevenue += report.estimatedRevenue;
            } catch (error) {
                console.error(`[HAAWK API] Error checking monitor ${monitor.id}:`, error);
            }
        }

        return {
            monitorsChecked: monitors.length,
            newUsagesFound,
            totalEstimatedRevenue,
        };
    }

    /**
     * Get detailed monetization report for a specific recording across all platforms.
     */
    async getMonetizationReport(recordingId: string): Promise<{
        totalClaims: number;
        totalViews: number;
        estimatedRevenue: number;
        byPlatform: Record<string, { claims: number; views: number; revenue: number }>;
    }> {
        console.log(`[HAAWK API] Fetching monetization data for recording ${recordingId}...`);

        const monitors = await prisma.contentIdMonitor.findMany({
            where: { recordingId },
            include: {
                usages: true,
            }
        });

        let totalClaims = 0;
        let totalViews = 0;
        let estimatedRevenue = 0;
        const byPlatform: Record<string, { claims: number; views: number; revenue: number }> = {};

        for (const monitor of monitors) {
            const platformStats = {
                claims: monitor.totalClaims,
                views: monitor.totalViews,
                revenue: monitor.estimatedRevenue,
            };
            byPlatform[monitor.platform] = platformStats;
            totalClaims += platformStats.claims;
            totalViews += platformStats.views;
            estimatedRevenue += platformStats.revenue;
        }

        return {
            totalClaims,
            totalViews,
            estimatedRevenue,
            byPlatform,
        };
    }

    /**
     * Get unregistered recordings that should be submitted for Content ID monitoring.
     */
    async getUnregisteredRecordings(orgId: string): Promise<Array<{
        id: string;
        title: string;
        isrc: string | null;
        artistName: string | null;
        missedPlatforms: string[];
        estimatedMissedRevenue: number;
    }>> {
        const allPlatforms = ["YouTube", "Facebook", "Instagram", "TikTok"];
        
        // Get all recordings for the org
        const recordings = await prisma.recording.findMany({
            where: { orgId },
            include: {
                contentIdMonitors: true,
            }
        });

        const unregistered: Array<{
            id: string;
            title: string;
            isrc: string | null;
            artistName: string | null;
            missedPlatforms: string[];
            estimatedMissedRevenue: number;
        }> = [];

        for (const recording of recordings) {
            const registeredPlatforms = recording.contentIdMonitors
                .filter(m => m.registrationStatus === "REGISTERED")
                .map(m => m.platform);
            
            const missedPlatforms = allPlatforms.filter(p => !registeredPlatforms.includes(p));
            
            if (missedPlatforms.length > 0) {
                // Estimate missed revenue based on similar recordings (mock calculation)
                const estimatedMissedRevenue = missedPlatforms.length * 10 * Math.random();
                
                unregistered.push({
                    id: recording.id,
                    title: recording.title,
                    isrc: recording.isrc,
                    artistName: recording.artistName,
                    missedPlatforms,
                    estimatedMissedRevenue,
                });
            }
        }

        return unregistered;
    }
}
