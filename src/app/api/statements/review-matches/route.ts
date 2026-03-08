/**
 * Review Matches API
 *
 * GET  - Fetch statement lines that were fuzzy-matched and need user review
 * POST - Confirm or reject fuzzy matches
 *
 * Fuzzy-matched lines have matchConfidence < 90 (below EXACT_TITLE threshold)
 * and need human verification before flowing into split calculations.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";
import { z } from "zod";

// ---------- GET: Fetch lines needing review ----------

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;
        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        const { searchParams } = new URL(req.url);
        const statementId = searchParams.get("statementId");
        const status = searchParams.get("status") || "pending"; // pending, confirmed, rejected
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build where clause for fuzzy-matched lines using the needsReview field
        const where: any = {
            statement: { orgId },
            workId: { not: null },
        };

        if (statementId) {
            where.statementId = statementId;
        }

        // Filter based on review status using the stored needsReview field
        if (status === "pending") {
            where.needsReview = true;
            where.reviewedAt = null;
        } else if (status === "confirmed" || status === "rejected") {
            where.reviewedAt = { not: null };
        }

        const lines = await db.statementLine.findMany({
            where,
            select: {
                id: true,
                title: true,
                artist: true,
                isrc: true,
                iswc: true,
                amount: true,
                uses: true,
                society: true,
                territory: true,
                workId: true,
                statementId: true,
                matchMethod: true,
                matchConfidence: true,
                needsReview: true,
                reviewedAt: true,
                createdAt: true,
            },
            orderBy: { amount: "desc" },
            take: limit,
            skip: offset,
        });

        // Fetch the matched works
        const workIds = [...new Set(lines.map(l => l.workId).filter(Boolean))] as string[];
        const works = await db.work.findMany({
            where: { id: { in: workIds } },
            select: { id: true, title: true, iswc: true },
        });
        const workMap = new Map(works.map(w => [w.id, w]));

        // Map lines to response format with match metadata
        const fuzzyMatches = lines.map(line => {
            const work = workMap.get(line.workId!);
            return {
                lineId: line.id,
                statementId: line.statementId,
                statementTitle: line.title,
                statementArtist: line.artist,
                statementIsrc: line.isrc,
                statementIswc: line.iswc,
                amount: line.amount,
                uses: line.uses,
                society: line.society,
                territory: line.territory,
                matchedWorkId: line.workId,
                matchedWorkTitle: work?.title || "Unknown",
                matchedWorkIswc: work?.iswc || null,
                matchMethod: line.matchMethod,
                matchConfidence: line.matchConfidence,
                createdAt: line.createdAt,
            };
        });

        // Get total count for pagination
        const total = await db.statementLine.count({ where });

        return NextResponse.json({
            matches: fuzzyMatches,
            total,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Review matches GET error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}

// ---------- POST: Confirm or reject fuzzy matches ----------

const reviewSchema = z.object({
    actions: z.array(z.object({
        lineId: z.string().min(1),
        action: z.enum(["confirm", "reject"]),
        /** If rejecting, optionally provide the correct workId */
        correctWorkId: z.string().optional(),
    })).min(1).max(200),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;
        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        const body = await req.json().catch(() => ({}));
        const parsed = reviewSchema.safeParse(body);

        if (!parsed.success) {
            return ApiErrors.BadRequest("Invalid request", parsed.error.flatten());
        }

        const { actions } = parsed.data;
        const userId = session.user.id;
        const reviewedAt = new Date();
        let confirmed = 0;
        let rejected = 0;
        let corrected = 0;

        // Batch-verify all line IDs belong to this org in a single query
        const lineIds = actions.map(a => a.lineId);
        const validLines = await db.statementLine.findMany({
            where: { id: { in: lineIds }, statement: { orgId } },
            select: { id: true },
        });
        const validLineIdSet = new Set(validLines.map(l => l.id));

        // Build update payloads for all valid actions, separating counting from DB ops
        const updateOps: ReturnType<typeof db.statementLine.update>[] = [];
        for (const { lineId, action, correctWorkId } of actions) {
            if (!validLineIdSet.has(lineId)) continue;

            if (action === "confirm") {
                confirmed++;
                updateOps.push(
                    db.statementLine.update({
                        where: { id: lineId },
                        data: { needsReview: false, reviewedAt, reviewedBy: userId },
                    })
                );
            } else if (action === "reject") {
                if (correctWorkId) {
                    corrected++;
                    updateOps.push(
                        db.statementLine.update({
                            where: { id: lineId },
                            data: {
                                workId: correctWorkId,
                                matchMethod: "USER_CORRECTED",
                                matchConfidence: 100,
                                needsReview: false,
                                reviewedAt,
                                reviewedBy: userId,
                            },
                        })
                    );
                } else {
                    rejected++;
                    updateOps.push(
                        db.statementLine.update({
                            where: { id: lineId },
                            data: {
                                workId: null,
                                matchMethod: "USER_REJECTED",
                                matchConfidence: 0,
                                needsReview: false,
                                reviewedAt,
                                reviewedBy: userId,
                            },
                        })
                    );
                }
            }
        }

        // Execute all updates in a single transaction
        if (updateOps.length > 0) {
            await db.$transaction(updateOps);
        }

        return NextResponse.json({
            success: true,
            confirmed,
            rejected,
            corrected,
            total: actions.length,
        });
    } catch (error: any) {
        console.error("Review matches POST error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}