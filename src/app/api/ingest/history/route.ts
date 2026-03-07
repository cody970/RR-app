import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });

        const history = await db.ingestJob.findMany({
            where: {
                orgId: session.user.orgId
            },
            include: {
                user: {
                    select: {
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 10 // Show last 10 imports
        });

        return NextResponse.json(history);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
