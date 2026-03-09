/**
 * Public API — Catalog Endpoints
 *
 * GET /api/v1/catalog          — List works and recordings
 * GET /api/v1/catalog?type=works       — List works only
 * GET /api/v1/catalog?type=recordings  — List recordings only
 *
 * Authenticated via API key (Bearer token).
 * Supports pagination, search, and filtering.
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

    const type = searchParams.get("type") || "all"; // all, works, recordings
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    try {
        const result: Record<string, unknown> = { page, limit };

        // ---------- Works ----------
        if (type === "all" || type === "works") {
            const worksWhere: Record<string, unknown> = { orgId };
            if (search) {
                worksWhere.title = { contains: search, mode: "insensitive" };
            }

            const [works, worksTotal] = await Promise.all([
                db.work.findMany({
                    where: worksWhere,
                    skip,
                    take: limit,
                    orderBy: { updatedAt: "desc" },
                    include: {
                        writers: {
                            include: {
                                writer: {
                                    select: { id: true, name: true, ipiCae: true },
                                },
                            },
                        },
                        registrations: {
                            select: {
                                id: true,
                                society: true,
                                status: true,
                                submittedAt: true,
                            },
                        },
                    },
                }),
                db.work.count({ where: worksWhere }),
            ]);

            result.works = works.map((w) => ({
                id: w.id,
                title: w.title,
                iswc: w.iswc,
                writers: w.writers.map((ww) => ({
                    id: ww.writer.id,
                    name: ww.writer.name,
                    ipi: ww.writer.ipi,
                    splitPercent: ww.splitPercent,
                    role: ww.role,
                })),
                registrations: w.registrations,
                createdAt: w.createdAt,
                updatedAt: w.updatedAt,
            }));
            result.worksTotal = worksTotal;
            result.worksPages = Math.ceil(worksTotal / limit);
        }

        // ---------- Recordings ----------
        if (type === "all" || type === "recordings") {
            const recordingsWhere: Record<string, unknown> = { orgId };
            if (search) {
                recordingsWhere.title = { contains: search, mode: "insensitive" };
            }

            const [recordings, recordingsTotal] = await Promise.all([
                db.recording.findMany({
                    where: recordingsWhere,
                    skip,
                    take: limit,
                    orderBy: { updatedAt: "desc" },
                    select: {
                        id: true,
                        title: true,
                        isrc: true,
                        artist: true,
                        workId: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                }),
                db.recording.count({ where: recordingsWhere }),
            ]);

            result.recordings = recordings;
            result.recordingsTotal = recordingsTotal;
            result.recordingsPages = Math.ceil(recordingsTotal / limit);
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Catalog API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}