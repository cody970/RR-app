import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validatePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "works";
        const q = searchParams.get("q")?.toLowerCase() || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = 20;

        if (type === "works") {
            const works = await db.work.findMany({
                where: {
                    orgId,
                    ...(q ? { title: { contains: q } } : {}),
                },
                include: {
                    writers: { include: { writer: true } },
                    registrations: true,
                    _count: { select: { recordings: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: "desc" },
            });

            const total = await db.work.count({
                where: {
                    orgId,
                    ...(q ? { title: { contains: q } } : {}),
                },
            });

            return NextResponse.json({ items: works, total, page, pageSize });
        } else {
            const recordings = await db.recording.findMany({
                where: {
                    orgId,
                    ...(q ? { title: { contains: q } } : {}),
                },
                include: {
                    work: true,
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: "desc" },
            });

            const total = await db.recording.count({
                where: {
                    orgId,
                    ...(q ? { title: { contains: q } } : {}),
                },
            });

            return NextResponse.json({ items: recordings, total, page, pageSize });
        }
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });

        const orgId = session.user.orgId;
        const role = session.user.role;

        // RBAC Check
        try {
            validatePermission(role, "CATALOG_EDIT");
        } catch (e: any) {
            return new Response(e.message, { status: 403 });
        }

        const { id, type, title, currentId } = await req.json();
        const { enrichMetadata } = await import("@/lib/enrichment");

        const result = await enrichMetadata(title, currentId);

        if (result.found) {
            // Update the DB if we found a missing ID
            if (type === "works" && result.externalIswc && !currentId) {
                await db.work.update({
                    where: { id, orgId },
                    data: { iswc: result.externalIswc }
                });
                await logActivity({
                    orgId,
                    userId: session.user.id,
                    action: "CATALOG_ENRICHED",
                    resourceId: id,
                    resourceType: "Work",
                    details: `Updated ISWC for ${title}: ${result.externalIswc} (Score: ${result.matchScore}%)`
                });
            } else if (type === "recordings" && result.externalIsrc && !currentId) {
                await db.recording.update({
                    where: { id, orgId },
                    data: { isrc: result.externalIsrc }
                });
                await logActivity({
                    orgId,
                    userId: session.user.id,
                    action: "CATALOG_ENRICHED",
                    resourceId: id,
                    resourceType: "Recording",
                    details: `Updated ISRC for ${title}: ${result.externalIsrc} (Score: ${result.matchScore}%)`
                });
            }
        }

        return NextResponse.json(result);
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
