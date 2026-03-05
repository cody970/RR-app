import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List all issued licenses for the org
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const licenses = await db.license.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            include: {
                work: { select: { id: true, title: true } },
                request: { select: { id: true, projectTitle: true, projectType: true } },
            },
        });

        return NextResponse.json(licenses);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
