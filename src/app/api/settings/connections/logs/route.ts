import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

// ---------------------------------------------------------------------------
// GET /api/settings/connections/logs — list recent ingestion activity logs
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(
            parseInt(searchParams.get("limit") || "50", 10),
            200,
        );
        const sourceId = searchParams.get("sourceId");

        const where: Record<string, unknown> = {
            orgId: session.user.orgId,
        };

        if (sourceId) {
            where.sourceId = sourceId;
        }

        const logs = await db.ingestionLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                source: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ logs });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}