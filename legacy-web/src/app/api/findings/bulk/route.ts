import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        const body = await req.json();
        const { ids, action, status } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return new Response("No finding IDs provided", { status: 400 });
        }

        if (action === "updateStatus" && status) {
            await db.finding.updateMany({
                where: { id: { in: ids }, orgId },
                data: { status },
            });
            return NextResponse.json({ success: true, updated: ids.length });
        }

        if (action === "createTasks") {
            const tasks = ids.map((findingId: string) => ({
                findingId,
                orgId,
                status: "OPEN",
            }));
            await db.task.createMany({ data: tasks });
            return NextResponse.json({ success: true, created: ids.length });
        }

        return new Response("Invalid action", { status: 400 });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
