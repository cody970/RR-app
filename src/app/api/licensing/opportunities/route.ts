import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

// GET: List open opportunities for the organization
export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const opportunities = await db.licenseOpportunity.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            include: { work: { select: { id: true, title: true } } }
        });

        return NextResponse.json(opportunities);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST: Create a new licensing opportunity/brief
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const body = await req.json();

        const opp = await db.licenseOpportunity.create({
            data: {
                orgId,
                title: body.title,
                description: body.description,
                budget: body.budget,
                deadline: body.deadline ? new Date(body.deadline) : null,
                media: body.media,
                territory: body.territory,
                workId: body.workId || null,
            },
        });

        return NextResponse.json(opp);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
