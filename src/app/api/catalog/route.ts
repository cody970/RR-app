import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        const where = { orgId: session.user.orgId };

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
                            artist: true,
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
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
