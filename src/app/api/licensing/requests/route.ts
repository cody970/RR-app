import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List all license requests for the org
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const requests = await db.licenseRequest.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            include: {
                work: { select: { id: true, title: true } },
                License: { select: { id: true, status: true } },
            },
        });

        return NextResponse.json(requests);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: Submit a new license request (public/unauthenticated or from dashboard)
export async function POST(req: NextRequest) {
    try {
        // Can be a public endpoint so don't require session unless orgId isn't provided
        const body = await req.json();

        let orgId = body.orgId;
        if (!orgId) {
            const session = await getServerSession(authOptions);
            if (!session?.user) return new Response("Unauthorized", { status: 401 });
            orgId = session.user.orgId;
        }

        const request = await db.licenseRequest.create({
            data: {
                orgId,
                workId: body.workId,
                requesterName: body.requesterName,
                requesterEmail: body.requesterEmail,
                requesterCompany: body.requesterCompany,
                projectType: body.projectType,
                projectTitle: body.projectTitle,
                media: body.media,
                territory: body.territory,
                term: body.term,
                budget: body.budget ? parseFloat(body.budget) : null,
                notes: body.notes,
            },
        });

        return NextResponse.json(request);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
