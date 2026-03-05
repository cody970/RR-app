import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const { status, notes } = await req.json();

        const task = await db.task.update({
            where: { id, orgId },
            data: { status, notes }
        });

        return NextResponse.json(task);
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
