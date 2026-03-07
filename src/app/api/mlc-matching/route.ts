/**
 * MLC Matching API Route
 *
 * Provides endpoints for MLC matching operations:
 * - GET: List MLC matching jobs for the current org
 * - POST: Trigger a new MLC matching job (bulk or single)
 *
 * Migrated from legacy-web with enhanced error handling,
 * retry logic, and modern architecture patterns.
 *
 * @see docs/research/MLC_Matching_Tool_Research_Report.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/infra/db";
import { asyncLogger } from "@/lib/infra/logger-async";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { withRetry } from "@/lib/infra/retry";
import {
    searchMLCByTitle,
    searchMLCByISRC,
    searchMLCByISWC,
    bulkMatchRecordings,
    checkUnclaimedRoyalties,
    fetchDURPUnmatchedRecordings,
    crossReferenceCatalogWithDURP,
    getMLCClientHealth,
    type MLCBulkMatchRequest,
} from "@/lib/clients/mlc-client";
import { z } from "zod";

// ---------- Validation Schemas ----------

const mlcMatchRequestSchema = z.object({
    mode: z.enum(["bulk", "single", "unclaimed", "durp-crossref", "health"]).default("bulk"),
    // For single mode
    title: z.string().optional(),
    isrc: z.string().optional(),
    iswc: z.string().optional(),
    writer: z.string().optional(),
    // For bulk mode - limit to prevent abuse
    limit: z.number().min(1).max(500).default(50),
});

// ---------- GET: List MLC Matching Jobs ----------

export async function GET(request: NextRequest) {
    const correlationId = crypto.randomUUID();

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json(
                { error: "Unauthorized", code: "UNAUTHORIZED" },
                { status: 401 }
            );
        }

        const orgId = session.user.orgId;

        asyncLogger.info("Fetching MLC matching jobs", {
            correlationId,
            operation: "mlc_matching_list",
            metadata: { orgId },
        });

        // Fetch recent MLC matching jobs
        const jobs = await withRetry(
            async () => {
                return db.mLCMatchJob.findMany({
                    where: { orgId },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                    include: {
                        _count: {
                            select: { results: true },
                        },
                    },
                });
            },
            { maxRetries: 2, baseDelay: 1000 }
        );

        // Get MLC client health status
        const health = getMLCClientHealth();

        return NextResponse.json({
            jobs,
            health,
            meta: {
                correlationId,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        asyncLogger.error(
            "Failed to fetch MLC matching jobs",
            error instanceof Error ? error : new Error(String(error)),
            { correlationId, operation: "mlc_matching_list" }
        );

        return NextResponse.json(
            {
                error: "Internal server error",
                code: "INTERNAL_ERROR",
                correlationId,
            },
            { status: 500 }
        );
    }
}

// ---------- POST: Trigger MLC Matching ----------

export async function POST(request: NextRequest) {
    const correlationId = crypto.randomUUID();

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json(
                { error: "Unauthorized", code: "UNAUTHORIZED" },
                { status: 401 }
            );
        }

        const orgId = session.user.orgId;
        const userId = session.user.id;

        // Rate limit: 5 MLC matching requests per 10 minutes per org
        const rateLimitResult = await checkRateLimit({
            key: `mlc-matching:${orgId}`,
            limit: 5,
            window: 600,
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Please wait before triggering another MLC matching job.",
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: rateLimitResult.retryAfter,
                },
                { status: 429 }
            );
        }

        // Parse and validate request body
        const body = await request.json().catch(() => ({}));
        const parsed = mlcMatchRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid request body",
                    code: "VALIDATION_ERROR",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { mode, title, isrc, iswc, writer, limit } = parsed.data;

        asyncLogger.info(`MLC matching triggered: ${mode}`, {
            correlationId,
            operation: "mlc_matching_trigger",
            metadata: { orgId, userId, mode },
        });

        // ---------- Health Check Mode ----------
        if (mode === "health") {
            const health = getMLCClientHealth();
            return NextResponse.json({
                health,
                meta: { correlationId, timestamp: new Date().toISOString() },
            });
        }

        // ---------- Single Search Mode ----------
        if (mode === "single") {
            if (!title && !isrc && !iswc) {
                return NextResponse.json(
                    {
                        error: "At least one of title, isrc, or iswc is required for single mode",
                        code: "VALIDATION_ERROR",
                    },
                    { status: 400 }
                );
            }

            let result;

            if (isrc) {
                result = await searchMLCByISRC(isrc);
            } else if (iswc) {
                result = await searchMLCByISWC(iswc);
            } else if (title) {
                result = await searchMLCByTitle(title, writer);
            }

            return NextResponse.json({
                mode: "single",
                result,
                meta: { correlationId, timestamp: new Date().toISOString() },
            });
        }

        // ---------- Unclaimed Royalties Mode ----------
        if (mode === "unclaimed") {
            const unclaimed = await checkUnclaimedRoyalties();

            return NextResponse.json({
                mode: "unclaimed",
                result: unclaimed,
                meta: { correlationId, timestamp: new Date().toISOString() },
            });
        }

        // ---------- DURP Cross-Reference Mode ----------
        if (mode === "durp-crossref") {
            // Fetch org's catalog for cross-referencing
            const catalogWorks = await db.work.findMany({
                where: { orgId },
                select: { title: true, iswc: true },
                take: limit,
            });

            const catalogRecordings = await db.recording.findMany({
                where: { orgId },
                select: { title: true, isrc: true, artistName: true },
                take: limit,
            });

            const catalogItems = [
                ...catalogWorks.map((w: { title: string; iswc: string | null }) => ({
                    title: w.title,
                    iswc: w.iswc || undefined,
                })),
                ...catalogRecordings.map((r: { title: string; isrc: string | null; artistName: string | null }) => ({
                    title: r.title,
                    isrc: r.isrc || undefined,
                    artist: r.artistName || undefined,
                })),
            ];

            const crossRefResult = await crossReferenceCatalogWithDURP(catalogItems);

            return NextResponse.json({
                mode: "durp-crossref",
                result: crossRefResult,
                meta: { correlationId, timestamp: new Date().toISOString() },
            });
        }

        // ---------- Bulk Matching Mode (Default) ----------

        // Create job record in database
        const jobRecord = await db.mLCMatchJob.create({
            data: {
                orgId,
                status: "RUNNING",
                totalWorks: 0,
                matchesFound: 0,
            },
        });

        // Fetch works to match (those not yet registered with MLC)
        const worksToMatch = await db.work.findMany({
            where: {
                orgId,
                registrations: {
                    none: { society: "MLC" },
                },
            },
            include: {
                writers: { include: { writer: true } },
            },
            take: limit,
        });

        // Fetch recordings to match
        const recordingsToMatch = await db.recording.findMany({
            where: { orgId },
            take: limit,
        });

        // Build bulk match request
        const bulkRequest: MLCBulkMatchRequest = {
            items: [
                ...worksToMatch.map((w: any) => ({
                    title: w.title,
                    iswc: w.iswc || undefined,
                    writer: w.writers?.[0]?.writer?.name || undefined,
                })),
                ...recordingsToMatch.map((r: any) => ({
                    title: r.title,
                    isrc: r.isrc || undefined,
                    artist: r.artistName || undefined,
                })),
            ],
        };

        if (bulkRequest.items.length === 0) {
            await db.mLCMatchJob.update({
                where: { id: jobRecord.id },
                data: { status: "COMPLETED", totalWorks: 0, matchesFound: 0 },
            });

            return NextResponse.json({
                mode: "bulk",
                jobId: jobRecord.id,
                message: "No unregistered works or recordings found to match",
                result: { totalSubmitted: 0, matched: 0, unmatched: 0, pending: 0, results: [] },
                meta: { correlationId, timestamp: new Date().toISOString() },
            });
        }

        // Execute bulk matching
        const bulkResult = await bulkMatchRecordings(bulkRequest);

        // Save individual match results
        for (const result of bulkResult.results) {
            await db.mLCMatchResult.create({
                data: {
                    jobId: jobRecord.id,
                    workTitle: result.inputTitle,
                    recordingISRC: result.inputIsrc || null,
                    recordingTitle: result.matchedRecording?.title || null,
                    recordingArtist: result.matchedRecording?.artist || null,
                    status: result.status,
                    confidence: result.confidence,
                },
            }).catch((err: Error) => {
                asyncLogger.warn(`Failed to save MLC match result for ${result.inputTitle}`, {
                    correlationId,
                    operation: "mlc_match_result_save",
                    metadata: { error: err.message },
                });
            });
        }

        // Update job record with results
        await db.mLCMatchJob.update({
            where: { id: jobRecord.id },
            data: {
                status: "COMPLETED",
                totalWorks: bulkResult.totalSubmitted,
                matchesFound: bulkResult.matched,
            },
        });

        asyncLogger.info("MLC bulk matching job completed", {
            correlationId,
            operation: "mlc_matching_complete",
            metadata: {
                jobId: jobRecord.id,
                totalSubmitted: bulkResult.totalSubmitted,
                matched: bulkResult.matched,
                unmatched: bulkResult.unmatched,
            },
        });

        return NextResponse.json({
            mode: "bulk",
            jobId: jobRecord.id,
            result: bulkResult,
            meta: { correlationId, timestamp: new Date().toISOString() },
        });
    } catch (error) {
        asyncLogger.error(
            "MLC matching job failed",
            error instanceof Error ? error : new Error(String(error)),
            { correlationId, operation: "mlc_matching_trigger" }
        );

        return NextResponse.json(
            {
                error: "MLC matching job failed",
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
                correlationId,
            },
            { status: 500 }
        );
    }
}