import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const job = await db.auditJob.findUnique({
        where: { id }
    });

    if (!job) {
        return new NextResponse("Job not found", { status: 404 });
    }

    if (job.orgId !== session.user.orgId) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(job);
}
