import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const tasks = await db.task.findMany({
            where: { orgId },
            include: { finding: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(tasks);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const { findingId, assigneeEmail, notes } = await req.json();

        const task = await db.task.create({
            data: {
                findingId,
                assigneeEmail,
                notes,
                status: "OPEN",
                orgId
            }
        });

        return NextResponse.json(task);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
