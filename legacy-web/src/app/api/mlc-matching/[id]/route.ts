import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    try {
        const job = await db.mLCMatchJob.findUnique({
            where: {
                id,
                orgId: session.user.orgId
            },
            include: {
                results: true
            }
        });

        if (!job) {
            return new NextResponse("Job not found", { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error) {
        console.error("Error fetching MLC matching job details:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
