/**
 * Public API — Registrations Endpoints
 *
 * GET /api/v1/registrations — List work registrations with filtering and pagination
 *
 * Query Parameters:
 *   status   — PENDING, SUBMITTED, ACKNOWLEDGED, REJECTED (comma-separated)
 *   society  — Society code (e.g., ASCAP, BMI, MLC, SESAC)
 *   workId   — Filter by specific work ID
 *   since    — ISO date string, only registrations updated after this date
 *   page     — Page number (default: 1)
 *   limit    — Items per page (default: 50, max: 100)
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";

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
    const societyFilter = searchParams.get("society");
    const workIdFilter = searchParams.get("workId");
    const since = searchParams.get("since");

    try {
        // Build where clause - registrations are linked to works, which belong to orgs
        const where: Record<string, unknown> = {
            work: { orgId },
        };

        if (statusFilter) {
            const statuses = statusFilter.split(",").map((s) => s.trim().toUpperCase());
            where.status = { in: statuses };
        }

        if (societyFilter) {
            const societies = societyFilter.split(",").map((s) => s.trim().toUpperCase());
            where.society = { in: societies };
        }

        if (workIdFilter) {
            where.workId = workIdFilter;
        }

        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                where.updatedAt = { gte: sinceDate };
            }
        }

        const [registrations, total] = await Promise.all([
            db.registration.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
                include: {
                    work: {
                        select: {
                            id: true,
                            title: true,
                            iswc: true,
                        },
                    },
                },
            }),
            db.registration.count({ where }),
        ]);

        const formatted = registrations.map((r) => ({
            id: r.id,
            workId: r.workId,
            workTitle: r.work.title,
            workIswc: r.work.iswc,
            society: r.society,
            status: r.status,
            totalSplitRegistered: r.totalSplitRegistered,
            submissionId: r.submissionId,
            confirmationId: r.confirmationId,
            submittedAt: r.submittedAt,
            acknowledgedAt: r.acknowledgedAt,
            submittedVia: r.submittedVia,
            errors: r.errors,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));

        return NextResponse.json({
            registrations: formatted,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        logger.error({ err: error }, "Registrations API error");
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
