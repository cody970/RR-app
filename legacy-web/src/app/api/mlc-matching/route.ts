import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mlcMatchingQueue } from "@/lib/queue";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const jobs = await db.mLCMatchJob.findMany({
            where: {
                orgId: session.user.orgId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Error fetching MLC matching jobs:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Create job record in database
        const jobRecord = await db.mLCMatchJob.create({
            data: {
                orgId: session.user.orgId,
                status: "PENDING"
            }
        });

        // Add to BullMQ queue
        const job = await mlcMatchingQueue.add('mlc-matching-run', {
            jobId: jobRecord.id,
            orgId: session.user.orgId,
            userId: session.user.id
        });

        return NextResponse.json({ success: true, jobId: jobRecord.id, queueJobId: job.id });
    } catch (error) {
        console.error("Error triggering MLC matching job:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
