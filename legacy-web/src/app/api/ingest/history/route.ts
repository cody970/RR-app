import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
