import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "quotes";

        if (type === "quotes") {
            const quotes = await db.syncQuote.findMany({
                where: { orgId: session.user.orgId },
                include: { work: true },
                orderBy: { updatedAt: "desc" }
            });
            return NextResponse.json(quotes);
        } else if (type === "placements") {
            const placements = await db.syncPlacement.findMany({
                where: { orgId: session.user.orgId },
                include: { work: true },
                orderBy: { createdAt: "desc" }
            });
            return NextResponse.json(placements);
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    } catch (error) {
        console.error("Error fetching sync data:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
