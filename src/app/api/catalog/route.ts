import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/get-session";
import { db } from "@/lib/infra/db";
import { z } from "zod";

const addWorkSchema = z.object({
    type: z.literal("work"),
    title: z.string().min(1).max(500),
    iswc: z.string().optional().nullable(),
    writers: z.array(z.object({
        name: z.string().min(1),
        splitPercent: z.number().min(0).max(100).default(100),
        role: z.string().optional(),
    })).optional().default([]),
});

const addRecordingSchema = z.object({
    type: z.literal("recording"),
    title: z.string().min(1).max(500),
    isrc: z.string().optional().nullable(),
    artistName: z.string().optional().nullable(),
    durationSec: z.number().int().positive().optional().nullable(),
    workId: z.string().optional().nullable(),
});

const addCatalogSchema = z.discriminatedUnion("type", [addWorkSchema, addRecordingSchema]);

export async function GET(req: Request) {
    try {
        const { orgId } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        const where = { orgId };

        const [works, total] = await Promise.all([
            db.work.findMany({
                where,
                include: {
                    writers: {
                        include: {
                            writer: {
                                select: { id: true, name: true, ipiCae: true },
                            },
                        },
                    },
                    recordings: {
                        select: {
                            id: true,
                            title: true,
                            isrc: true,
                            artistName: true,
                            durationSec: true,
                            workId: true,
                        },
                    },
                },
                take: limit,
                skip: skip,
                orderBy: { title: 'asc' }
            }),
            db.work.count({ where })
        ]);

        return NextResponse.json({
            works,
            pagination: {
                total,
                page,
                limit,
                hasMore: total > skip + works.length
            }
        });
    } catch (error: unknown) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { orgId, userId } = await requireAuth();
        const body = await req.json();
        const parsed = addCatalogSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;

        if (data.type === "work") {
            const result = await db.$transaction(async (tx) => {
                const work = await tx.work.create({
                    data: {
                        title: data.title,
                        iswc: data.iswc || null,
                        orgId,
                    },
                });

                for (const w of data.writers) {
                    let writer = await tx.writer.findFirst({
                        where: { name: w.name, orgId },
                    });
                    if (!writer) {
                        writer = await tx.writer.create({
                            data: { name: w.name, orgId },
                        });
                    }
                    await tx.workWriter.create({
                        data: {
                            workId: work.id,
                            writerId: writer.id,
                            splitPercent: w.splitPercent,
                            role: w.role || null,
                        },
                    });
                }

                await tx.auditLog.create({
                    data: {
                        action: "CATALOG_WORK_CREATED",
                        entityType: "Work",
                        entityId: work.id,
                        userId,
                        orgId,
                        details: { title: data.title, writerCount: data.writers.length },
                    },
                });

                return tx.work.findUnique({
                    where: { id: work.id },
                    include: {
                        writers: { include: { writer: { select: { id: true, name: true, ipiCae: true } } } },
                    },
                });
            });

            return NextResponse.json(result, { status: 201 });
        }

        // Recording
        if (data.workId) {
            const work = await db.work.findFirst({
                where: { id: data.workId, orgId },
            });
            if (!work) {
                return NextResponse.json({ error: "Work not found" }, { status: 404 });
            }
        }

        const recording = await db.$transaction(async (tx) => {
            const rec = await tx.recording.create({
                data: {
                    title: data.title,
                    isrc: data.isrc || null,
                    artistName: data.artistName || null,
                    durationSec: data.durationSec || null,
                    workId: data.workId || null,
                    orgId,
                },
            });

            await tx.auditLog.create({
                data: {
                    action: "CATALOG_RECORDING_CREATED",
                    entityType: "Recording",
                    entityId: rec.id,
                    userId,
                    orgId,
                    details: { title: data.title, isrc: data.isrc },
                },
            });

            return rec;
        });

        return NextResponse.json(recording, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
