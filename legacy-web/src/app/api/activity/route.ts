import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    try {
        const activities = await db.activity.findMany({
            where: { orgId },
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 20, // Only show last 20 actions in the small feed
        });

        return NextResponse.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
