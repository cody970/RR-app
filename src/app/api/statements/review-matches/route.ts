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

        // Build where clause for fuzzy-matched lines
        // Lines with workId set but low confidence are fuzzy matches needing review
        const where: any = {
            statement: { orgId },
            workId: { not: null },
        };

        if (statementId) {
            where.statementId = statementId;
        }

        // We identify fuzzy matches by checking if the title doesn't exactly match
        // the work title (since we don't have a dedicated matchMethod column yet)
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
                createdAt: true,
            },
            orderBy: { amount: "desc" },
            take: limit,
            skip: offset,
        });

        // Fetch the matched works to compare titles
        const workIds = [...new Set(lines.map(l => l.workId).filter(Boolean))] as string[];
        const works = await db.work.findMany({
            where: { id: { in: workIds } },
            select: { id: true, title: true, iswc: true },
        });
        const workMap = new Map(works.map(w => [w.id, w]));

        // Identify fuzzy matches: lines where title doesn't exactly match work title
        const fuzzyMatches = lines
            .filter(line => {
                if (!line.workId || !line.title) return false;
                const work = workMap.get(line.workId);
                if (!work) return false;
                // If titles match exactly (case-insensitive), it's not a fuzzy match
                return line.title.toUpperCase().trim() !== work.title.toUpperCase().trim();
            })
            .map(line => {
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
                    createdAt: line.createdAt,
                };
            });

        const total = fuzzyMatches.length;

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
        let confirmed = 0;
        let rejected = 0;
        let corrected = 0;

        for (const { lineId, action, correctWorkId } of actions) {
            // Verify the line belongs to this org
            const line = await db.statementLine.findFirst({
                where: {
                    id: lineId,
                    statement: { orgId },
                },
            });

            if (!line) continue;

            if (action === "confirm") {
                // Match is confirmed — no changes needed, the workId stays
                confirmed++;
            } else if (action === "reject") {
                if (correctWorkId) {
                    // User provided the correct work — update the match
                    await db.statementLine.update({
                        where: { id: lineId },
                        data: { workId: correctWorkId },
                    });
                    corrected++;
                } else {
                    // Reject the match entirely — set workId to null
                    await db.statementLine.update({
                        where: { id: lineId },
                        data: { workId: null },
                    });
                    rejected++;
                }
            }
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