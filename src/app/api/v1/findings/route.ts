/**
 * Public API — Findings Endpoints
 *
 * GET /api/v1/findings — List audit findings with filtering and pagination
 *
 * Query Parameters:
 *   status   — OPEN, RECOVERED, DISPUTED, IGNORED (comma-separated)
 *   severity — HIGH, MEDIUM, LOW (comma-separated)
 *   type     — MISSING_WORK, RATE_ANOMALY, REVENUE_DROP, UNMATCHED_LINE, etc.
 *   since    — ISO date string, only findings created after this date
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

    const statusFilter = searchParams.get("status");
    const severityFilter = searchParams.get("severity");
    const typeFilter = searchParams.get("type");
    const since = searchParams.get("since");

    try {
        // Build where clause
        const where: Record<string, unknown> = { orgId };

        if (statusFilter) {
            const statuses = statusFilter.split(",").map((s) => s.trim().toUpperCase());
            where.status = { in: statuses };
        }

        if (severityFilter) {
            const severities = severityFilter.split(",").map((s) => s.trim().toUpperCase());
            where.severity = { in: severities };
        }

        if (typeFilter) {
            const types = typeFilter.split(",").map((s) => s.trim());
            where.type = { in: types };
        }

        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                where.createdAt = { gte: sinceDate };
            }
        }

        const [findings, total] = await Promise.all([
            db.finding.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    tasks: {
                        select: {
                            id: true,
                            status: true,
                            assigneeEmail: true,
                        },
                    },
                },
            }),
            db.finding.count({ where }),
        ]);

        const formatted = findings.map((f) => ({
            id: f.id,
            type: f.type,
            severity: f.severity,
            status: f.status,
            confidence: f.confidence,
            estimatedImpact: f.estimatedImpact,
            recoveredAmount: f.recoveredAmount,
            amountOriginal: f.amountOriginal,
            currency: f.currency,
            resourceType: f.resourceType,
            resourceId: f.resourceId,
            metadataFix: f.metadataFix,
            tasks: f.tasks,
            createdAt: f.createdAt,
        }));

        return NextResponse.json({
            findings: formatted,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        console.error("Findings API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}