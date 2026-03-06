import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim();

        if (!q || q.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const searchTerm = `%${q}%`;

        const [works, recordings, findings] = await Promise.all([
            db.work.findMany({
                where: {
                    orgId,
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { iswc: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, title: true, iswc: true },
                take: 5,
            }),
            db.recording.findMany({
                where: {
                    orgId,
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { isrc: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, title: true, isrc: true },
                take: 5,
            }),
            db.finding.findMany({
                where: {
                    orgId,
                    OR: [
                        { type: { contains: q, mode: "insensitive" } },
                        { resourceId: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, type: true, resourceId: true, severity: true },
                take: 5,
            }),
        ]);

        const results = [
            ...works.map((w) => ({
                id: w.id,
                title: w.title,
                type: "Work" as const,
                identifier: w.iswc || undefined,
            })),
            ...recordings.map((r) => ({
                id: r.id,
                title: r.title,
                type: "Recording" as const,
                identifier: r.isrc || undefined,
            })),
            ...findings.map((f) => ({
                id: f.id,
                title: `${f.type.replace(/_/g, " ")} (${f.severity})`,
                type: "Finding" as const,
                identifier: f.resourceId,
            })),
        ];

        return NextResponse.json({ results });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
