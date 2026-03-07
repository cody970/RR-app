/**
 * Public API — Statements Endpoints
 *
 * GET /api/v1/statements — List imported royalty statements with filtering and pagination
 *
 * Query Parameters:
 *   source   — Society source (e.g., ASCAP, BMI, MLC, SOUNDEXCHANGE)
 *   period   — Period filter (e.g., 2024-Q1, 2024-01)
 *   status   — PROCESSING, PROCESSED, FAILED (comma-separated)
 *   since    — ISO date string, only statements imported after this date
 *   page     — Page number (default: 1)
 *   limit    — Items per page (default: 50, max: 100)
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    const authHeader = req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return NextResponse.json(
            { error: "Unauthorized: Invalid API Key" },
            { status: 401 },
        );
    }

    const orgId = organization.id;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const sourceFilter = searchParams.get("source");
    const periodFilter = searchParams.get("period");
    const statusFilter = searchParams.get("status");
    const since = searchParams.get("since");
    const includeLines = searchParams.get("includeLines") === "true";

    try {
        // Build where clause
        const where: Record<string, unknown> = { orgId };

        if (sourceFilter) {
            const sources = sourceFilter.split(",").map((s) => s.trim().toUpperCase());
            where.source = { in: sources };
        }

        if (periodFilter) {
            where.period = periodFilter;
        }

        if (statusFilter) {
            const statuses = statusFilter.split(",").map((s) => s.trim().toUpperCase());
            where.status = { in: statuses };
        }

        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                where.createdAt = { gte: sinceDate };
            }
        }

        const [statements, total] = await Promise.all([
            db.statement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: includeLines
                    ? {
                          lines: {
                              take: 100, // Limit lines per statement
                              select: {
                                  id: true,
                                  isrc: true,
                                  iswc: true,
                                  title: true,
                                  artist: true,
                                  uses: true,
                                  amount: true,
                                  amountOriginal: true,
                                  currency: true,
                                  society: true,
                                  territory: true,
                                  useType: true,
                                  rate: true,
                                  workId: true,
                              },
                          },
                      }
                    : undefined,
            }),
            db.statement.count({ where }),
        ]);

        const formatted = statements.map((s) => ({
            id: s.id,
            source: s.source,
            period: s.period,
            fileName: s.fileName,
            fileType: s.fileType,
            totalAmount: s.totalAmount,
            lineCount: s.lineCount,
            status: s.status,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            ...(includeLines && "lines" in s ? { lines: s.lines } : {}),
        }));

        return NextResponse.json({
            statements: formatted,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        console.error("Statements API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
